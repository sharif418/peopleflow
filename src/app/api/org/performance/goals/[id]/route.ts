// PATCH /api/org/performance/goals/[id] — update progress / status transitions.
//   { currentValue?, status?: "completed" | "cancelled" }
//   Only active goals can change; currentValue >= targetValue auto-completes
//   (when no explicit status was given). Overdue = active + dueDate < today.
// DELETE /api/org/performance/goals/[id] — delete an ACTIVE goal only.
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../../_lib/helpers"
import {
  GOAL_INCLUDE,
  goalComputedRow,
  goalProgressPercent,
  todayIso,
} from "../../_lib/helpers"
import { goalPatchSchema, zodPerfError } from "../../_lib/schemas"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.goal.findFirst({
    where: { id, organizationId: guard.org.id },
    include: GOAL_INCLUDE,
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = goalPatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodPerfError(parsed.error), 400)
  const data = parsed.data

  if (existing.status !== "active") return fail("not_active", 409)

  const today = todayIso()
  const nextCurrent = data.currentValue ?? existing.currentValue
  let nextStatus = data.status ?? existing.status
  let autoCompleted = false

  // Auto-suggest: reaching the target completes an active goal (unless an
  // explicit status was supplied in this same request).
  if (
    data.status === undefined &&
    existing.status === "active" &&
    existing.targetValue > 0 &&
    nextCurrent >= existing.targetValue
  ) {
    nextStatus = "completed"
    autoCompleted = true
  }

  // Explicit completion caps the recorded progress at the target.
  const safeCurrent = data.status === "completed" ? Math.max(nextCurrent, existing.targetValue) : nextCurrent

  try {
    const updated = await db.goal.update({
      where: { id },
      data: { currentValue: safeCurrent, status: nextStatus },
      include: GOAL_INCLUDE,
    })
    await audit(
      guard,
      `performance.goal.${nextStatus === "completed" ? "completed" : nextStatus === "cancelled" ? "cancelled" : "progressed"}`,
      "goal",
      id,
      `${existing.employee.employeeCode} ${existing.employee.firstName} ${existing.employee.lastName} — ${existing.title}: ${goalProgressPercent(updated.targetValue, updated.currentValue)}%${autoCompleted ? " (auto)" : ""}`,
    )
    return ok({ ...goalComputedRow(updated, today), autoCompleted })
  } catch {
    return fail("update_failed", 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.goal.findFirst({
    where: { id, organizationId: guard.org.id },
    include: GOAL_INCLUDE,
  })
  if (!existing) return fail("not_found", 404)

  // Only active goals can be removed — completed/cancelled history is kept.
  if (existing.status !== "active") return fail("not_active", 409)

  try {
    await db.goal.delete({ where: { id } })
    await audit(
      guard,
      "performance.goal.deleted",
      "goal",
      id,
      `${existing.employee.employeeCode} ${existing.employee.firstName} ${existing.employee.lastName} — ${existing.title}`,
    )
    return ok({ id, deleted: true })
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2003") return fail("in_use", 409)
    return fail("delete_failed", 500)
  }
}
