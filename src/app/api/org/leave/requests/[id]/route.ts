// PATCH /api/org/leave/requests/[id] — review a pending request
//   { action: "approve" | "reject" | "cancel", note? }
//   approve → re-validates balance; only pending requests can be processed.
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit } from "../../../_lib/helpers"
import {
  LEAVE_REQUEST_INCLUDE,
  activeLeaveRequests,
  balanceExcludingSelf,
  buildUsageIndex,
} from "../../_lib/helpers"
import { leaveRequestActionSchema, zodLeaveError } from "../../_lib/schemas"

const RESULT_STATUS: Record<string, string> = {
  approve: "approved",
  reject: "rejected",
  cancel: "cancelled",
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.leaveRequest.findFirst({
    where: { id, organizationId: guard.org.id },
    include: LEAVE_REQUEST_INCLUDE,
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = leaveRequestActionSchema.safeParse(body)
  if (!parsed.success) return fail(zodLeaveError(parsed.error), 400)
  const { action, note } = parsed.data

  if (existing.status !== "pending") return fail("not_pending", 409)

  if (action === "approve") {
    const actives = await activeLeaveRequests(guard.org.id)
    const usage = buildUsageIndex(actives)
    const balance = balanceExcludingSelf(
      usage,
      existing.employeeId,
      existing.leaveTypeId,
      existing.fromDate.slice(0, 4),
      { status: "pending", days: existing.days },
      existing.leaveType.daysPerYear,
    )
    if (existing.days > balance) return fail("insufficient_balance", 409)
  }

  const status = RESULT_STATUS[action]
  try {
    const updated = await db.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewerNote: note ?? null,
        reviewedAt: new Date(),
      },
      include: LEAVE_REQUEST_INCLUDE,
    })

    const name = `${existing.employee.employeeCode} ${existing.employee.firstName} ${existing.employee.lastName}`
    await audit(
      guard,
      `leave.${action === "approve" ? "approved" : action === "reject" ? "rejected" : "cancelled"}`,
      "leave_request",
      id,
      `${name} — ${existing.leaveType.name} ${existing.days}d${note ? ` (${note})` : ""}`,
    )

    return ok(updated)
  } catch {
    return fail("update_failed", 500)
  }
}
