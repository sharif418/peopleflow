// GET    /api/org/expenses/claims/[id] — claim detail + items + employee
// PATCH  /api/org/expenses/claims/[id] — review state machine:
//          { action: "approve" | "reject" | "mark_paid", note? }
//          submitted → approved | rejected (reviewerNote, reviewedAt)
//          approved  → paid (mark paid; note optional, keeps approval note)
//          reject requires a note ("note_required")
// DELETE  /api/org/expenses/claims/[id] — only while submitted
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../../_lib/helpers"
import {
  CLAIM_DETAIL_INCLUDE,
  resolveTransition,
  transitionErrorCode,
} from "../../_lib/helpers"
import { claimActionSchema, zodExpenseError } from "../../_lib/schemas"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  try {
    const claim = await db.expenseClaim.findFirst({
      where: { id, organizationId: guard.org.id },
      include: CLAIM_DETAIL_INCLUDE,
    })
    if (!claim) return fail("not_found", 404)
    return ok(claim)
  } catch {
    return fail("load_failed", 500)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = claimActionSchema.safeParse(body)
  if (!parsed.success) return fail(zodExpenseError(parsed.error), 400)
  const { action, note } = parsed.data

  const existing = await db.expenseClaim.findFirst({
    where: { id, organizationId: guard.org.id },
    include: CLAIM_DETAIL_INCLUDE,
  })
  if (!existing) return fail("not_found", 404)

  const status = resolveTransition(action, existing.status)
  if (!status) return fail(transitionErrorCode(action), 409)

  if (action === "reject" && !note) return fail("note_required", 400)

  // mark_paid keeps the earlier approval note unless a payment note is given.
  const reviewerNote =
    action === "mark_paid" ? (note ?? existing.reviewerNote) : (note ?? null)

  try {
    const updated = await db.expenseClaim.update({
      where: { id },
      data: {
        status,
        reviewerNote,
        reviewedAt: new Date(),
      },
      include: CLAIM_DETAIL_INCLUDE,
    })

    const name = `${existing.employee.employeeCode} ${existing.employee.firstName} ${existing.employee.lastName}`
    const auditAction =
      action === "mark_paid" ? "expense.paid" : `expense.${action === "approve" ? "approved" : "rejected"}`
    await audit(
      guard,
      auditAction,
      "expense_claim",
      id,
      `${name} — ${existing.title} ৳${existing.totalAmount}${note ? ` (${note})` : ""}`,
    )

    return ok(updated)
  } catch (x) {
    if (isPrismaKnownError(x)) return fail("update_failed", 409)
    return fail("update_failed", 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.expenseClaim.findFirst({
    where: { id, organizationId: guard.org.id },
    select: { id: true, title: true, totalAmount: true, status: true, employeeId: true },
  })
  if (!existing) return fail("not_found", 404)
  if (existing.status !== "submitted") return fail("not_submitted", 409)

  try {
    await db.expenseClaim.delete({ where: { id } })
    await audit(
      guard,
      "expense.deleted",
      "expense_claim",
      id,
      `${existing.title} ৳${existing.totalAmount}`,
    )
    return ok({ id })
  } catch (x) {
    if (isPrismaKnownError(x)) return fail("delete_failed", 409)
    return fail("delete_failed", 500)
  }
}
