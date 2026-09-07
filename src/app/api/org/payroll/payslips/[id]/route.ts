// GET /api/org/payroll/payslips/[id] — full payslip document
// PATCH /api/org/payroll/payslips/[id] — status transitions (confirm / mark_paid / revert_draft)
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit } from "../../../_lib/helpers"
import { payslipActionSchema, zodError } from "../../_lib/schemas"

async function loadSlip(id: string, orgId: string) {
  const slip = await db.payslip.findFirst({
    where: { id, organizationId: orgId },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          designation: { select: { name: true } },
          department: { select: { name: true } },
          dateOfJoining: true,
        },
      },
      structure: { select: { id: true, name: true } },
      items: true,
    },
  })
  return slip
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  try {
    const slip = await loadSlip(id, guard.org.id)
    if (!slip) return fail("not_found", 404)

    // Earnings first, then deductions (stable within each group).
    const sorted = [...slip.items].sort((a, b) => {
      const rank = (t: string) => (t === "earning" ? 0 : 1)
      return rank(a.type) - rank(b.type)
    })

    return ok({
      id: slip.id,
      period: slip.period,
      gross: slip.gross,
      totalEarnings: slip.totalEarnings,
      totalDeductions: slip.totalDeductions,
      netPay: slip.netPay,
      pfEmployee: slip.pfEmployee,
      pfEmployer: slip.pfEmployer,
      status: slip.status,
      createdAt: slip.createdAt,
      structure: slip.structure ? { id: slip.structure.id, name: slip.structure.name } : null,
      employee: {
        id: slip.employee.id,
        code: slip.employee.employeeCode,
        firstName: slip.employee.firstName,
        lastName: slip.employee.lastName,
        designation: slip.employee.designation?.name ?? null,
        department: slip.employee.department?.name ?? null,
        dateOfJoining: slip.employee.dateOfJoining,
      },
      items: sorted.map((i) => ({ id: i.id, label: i.label, type: i.type, amount: i.amount })),
      org: { name: guard.org.name, address: guard.org.address, pfEnabled: guard.org.pfEnabled, pfPercent: guard.org.pfPercent },
    })
  } catch {
    return fail("load_failed", 500)
  }
}

const TRANSITIONS: Record<string, Record<string, string>> = {
  confirm: { draft: "confirmed" },
  mark_paid: { confirmed: "paid" },
  revert_draft: { confirmed: "draft" },
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = payslipActionSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const { action } = parsed.data

  try {
    const slip = await loadSlip(id, guard.org.id)
    if (!slip) return fail("not_found", 404)

    const nextStatus = TRANSITIONS[action]?.[slip.status]
    if (!nextStatus) return fail("invalid_transition", 409)

    await db.payslip.update({ where: { id }, data: { status: nextStatus } })

    const auditAction = `payroll.payslip.${nextStatus === "paid" ? "paid" : nextStatus === "confirmed" ? "confirmed" : "reverted_to_draft"}`
    await audit(
      guard,
      auditAction,
      "payslip",
      id,
      `${slip.employee.employeeCode} ${slip.employee.firstName} ${slip.employee.lastName} · ${slip.period} · ${slip.status} → ${nextStatus}`,
    )

    return ok({ id, status: nextStatus })
  } catch {
    return fail("action_failed", 500)
  }
}
