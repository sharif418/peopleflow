// POST /api/org/payroll/generate — (re)generate DRAFT payslips for a period
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit } from "../../_lib/helpers"
import { generateSchema, zodError } from "../_lib/schemas"
import { BD_DEFAULTS, computePayslip, type ComponentInput } from "../_lib/payroll"

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const { period, structureId } = parsed.data

  // Resolve structure: explicit → default → first → BD defaults fallback.
  const structure = structureId
    ? await db.salaryStructure.findFirst({
        where: { id: structureId, organizationId: guard.org.id },
        include: { components: true },
      })
    : await db.salaryStructure.findFirst({
        where: { organizationId: guard.org.id, isDefault: true },
        include: { components: true },
      })
  if (structureId && !structure) return fail("invalid_structure", 400)

  const resolved =
    structure ??
    (await db.salaryStructure.findFirst({
      where: { organizationId: guard.org.id },
      include: { components: true },
    }))

  const components: ComponentInput[] = resolved
    ? resolved.components.map((c) => ({
        name: c.name,
        abbr: c.abbr,
        type: c.type,
        calcType: c.calcType,
        value: c.value,
      }))
    : BD_DEFAULTS

  const employees = await db.employee.findMany({
    where: {
      organizationId: guard.org.id,
      status: { in: ["active", "probation"] },
      monthlySalary: { gt: 0 },
    },
    select: { id: true, employeeCode: true, firstName: true, lastName: true, monthlySalary: true },
    orderBy: { employeeCode: "asc" },
  })

  let generated = 0
  let skipped = 0

  try {
    // Artificial delay so generation "feels" like real ERP work.
    await new Promise((resolve) => setTimeout(resolve, 1500))

    for (const emp of employees) {
      const existing = await db.payslip.findUnique({
        where: { employeeId_period: { employeeId: emp.id, period } },
        select: { id: true, status: true },
      })

      if (existing && existing.status !== "draft") {
        skipped += 1
        continue
      }

      const gross = emp.monthlySalary ?? 0
      const { items, totals } = computePayslip(gross, components, {
        enabled: guard.org.pfEnabled,
        percent: guard.org.pfPercent,
      })

      const itemsData = items.map((i) => ({ label: i.label, type: i.type, amount: i.amount }))
      const base = {
        organizationId: guard.org.id,
        employeeId: emp.id,
        structureId: resolved?.id ?? null,
        period,
        gross: totals.gross,
        totalEarnings: totals.totalEarnings,
        totalDeductions: totals.totalDeductions,
        netPay: totals.netPay,
        pfEmployee: totals.pfEmployee,
        pfEmployer: totals.pfEmployer,
        status: "draft",
      }

      if (existing) {
        await db.payslipItem.deleteMany({ where: { payslipId: existing.id } })
        await db.payslip.update({
          where: { id: existing.id },
          data: { ...base, items: { create: itemsData } },
        })
      } else {
        await db.payslip.create({ data: { ...base, items: { create: itemsData } } })
      }
      generated += 1
    }

    await audit(
      guard,
      "payroll.generated",
      "payslip",
      period,
      `period ${period} · structure ${resolved?.name ?? "BD_DEFAULTS"} · generated ${generated} · skipped ${skipped}`,
    )

    return ok({ period, structure: resolved?.name ?? null, generated, skipped, total: employees.length })
  } catch {
    return fail("generate_failed", 500)
  }
}
