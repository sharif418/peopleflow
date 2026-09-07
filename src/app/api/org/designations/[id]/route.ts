// PATCH /api/org/designations/[id] — rename (org-scoped)
// DELETE /api/org/designations/[id] — delete (employees keep via SetNull)
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { designationPatchSchema, zodError } from "../../_lib/schemas"
import { audit } from "../../_lib/helpers"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.designation.findFirst({
    where: { id, organizationId: guard.org.id },
    select: { id: true },
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)
  const parsed = designationPatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)

  const name = parsed.data.name.trim()
  const clash = await db.designation.findFirst({
    where: { organizationId: guard.org.id, name, NOT: { id } },
    select: { id: true },
  })
  if (clash) return fail("name_taken", 409)

  try {
    const updated = await db.designation.update({
      where: { id },
      data: { name },
      include: { _count: { select: { employees: true } } },
    })
    await audit(guard, "designation.updated", "designation", id, name)
    return ok({
      id: updated.id,
      name: updated.name,
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

  const existing = await db.designation.findFirst({
    where: { id, organizationId: guard.org.id },
    include: { _count: { select: { employees: true } } },
  })
  if (!existing) return fail("not_found", 404)

  try {
    await db.designation.delete({ where: { id } })
    await audit(
      guard,
      "designation.deleted",
      "designation",
      id,
      `${existing.name} (${existing._count.employees} employees unlinked)`,
    )
    return ok({ id })
  } catch {
    return fail("delete_failed", 500)
  }
}
