// PATCH /api/org/shifts/[id] — update name/times (org-scoped)
// DELETE /api/org/shifts/[id] — delete (employees keep via SetNull)
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { shiftPatchSchema, zodError } from "../../_lib/schemas"
import { audit } from "../../_lib/helpers"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.shift.findFirst({
    where: { id, organizationId: guard.org.id },
    select: { id: true },
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)
  const parsed = shiftPatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)

  const name = parsed.data.name.trim()
  const clash = await db.shift.findFirst({
    where: { organizationId: guard.org.id, name, NOT: { id } },
    select: { id: true },
  })
  if (clash) return fail("name_taken", 409)

  try {
    const data: { name: string; startTime?: string; endTime?: string } = { name }
    if (parsed.data.startTime !== undefined) data.startTime = parsed.data.startTime
    if (parsed.data.endTime !== undefined) data.endTime = parsed.data.endTime
    const updated = await db.shift.update({
      where: { id },
      data,
      include: { _count: { select: { employees: true } } },
    })
    await audit(
      guard,
      "shift.updated",
      "shift",
      id,
      `${name} ${updated.startTime}-${updated.endTime}`,
    )
    return ok({
      id: updated.id,
      name: updated.name,
      startTime: updated.startTime,
      endTime: updated.endTime,
      employeesCount: updated._count.employees,
      createdAt: updated.createdAt,
    })
  } catch {
    return fail("update_failed", 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.shift.findFirst({
    where: { id, organizationId: guard.org.id },
    include: { _count: { select: { employees: true } } },
  })
  if (!existing) return fail("not_found", 404)

  try {
    await db.shift.delete({ where: { id } })
    await audit(
      guard,
      "shift.deleted",
      "shift",
      id,
      `${existing.name} (${existing._count.employees} employees unlinked)`,
    )
    return ok({ id })
  } catch {
    return fail("delete_failed", 500)
  }
}
