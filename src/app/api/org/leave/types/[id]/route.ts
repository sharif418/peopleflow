// PATCH /api/org/leave/types/[id] — partial update (org-scoped)
// DELETE /api/org/leave/types/[id] — guarded delete (fails "in_use" when referenced)
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../../_lib/helpers"
import { leaveTypePatchSchema, zodLeaveError } from "../../_lib/schemas"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.leaveType.findFirst({
    where: { id, organizationId: guard.org.id },
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = leaveTypePatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodLeaveError(parsed.error), 400)
  const data = parsed.data

  if (data.name && data.name !== existing.name) {
    const clash = await db.leaveType.findFirst({
      where: { organizationId: guard.org.id, name: data.name, NOT: { id } },
      select: { id: true },
    })
    if (clash) return fail("name_taken", 409)
  }

  const update: Record<string, unknown> = {}
  if (data.name !== undefined) update.name = data.name
  if (data.daysPerYear !== undefined) update.daysPerYear = data.daysPerYear
  if (data.isPaid !== undefined) update.isPaid = data.isPaid
  if (data.carryForward !== undefined) update.carryForward = data.carryForward

  try {
    const updated = await db.leaveType.update({ where: { id }, data: update })
    await audit(guard, "leave_type.updated", "leave_type", id, `${updated.name} (${updated.daysPerYear}d)`)
    return ok(updated)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("name_taken", 409)
    return fail("update_failed", 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.leaveType.findFirst({
    where: { id, organizationId: guard.org.id },
  })
  if (!existing) return fail("not_found", 404)

  const referencing = await db.leaveRequest.count({
    where: { leaveTypeId: id },
  })
  if (referencing > 0) return fail("in_use", 409)

  try {
    await db.leaveType.delete({ where: { id } })
    await audit(guard, "leave_type.deleted", "leave_type", id, existing.name)
    return ok({ id })
  } catch {
    return fail("delete_failed", 500)
  }
}
