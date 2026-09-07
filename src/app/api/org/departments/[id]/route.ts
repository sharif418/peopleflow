// PATCH /api/org/departments/[id] — rename (org-scoped)
// DELETE /api/org/departments/[id] — delete (employees keep via SetNull)
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { departmentPatchSchema, zodError } from "../../_lib/schemas"
import { audit } from "../../_lib/helpers"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.department.findFirst({
    where: { id, organizationId: guard.org.id },
    select: { id: true },
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)
  const parsed = departmentPatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)

  const name = parsed.data.name.trim()
  const clash = await db.department.findFirst({
    where: { organizationId: guard.org.id, name, NOT: { id } },
    select: { id: true },
  })
  if (clash) return fail("name_taken", 409)

  try {
    const updated = await db.department.update({
      where: { id },
      data: { name },
      include: { _count: { select: { employees: true } } },
    })
    await audit(guard, "department.updated", "department", id, name)
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

  const existing = await db.department.findFirst({
    where: { id, organizationId: guard.org.id },
    include: { _count: { select: { employees: true } } },
  })
  if (!existing) return fail("not_found", 404)

  try {
    await db.department.delete({ where: { id } })
    await audit(
      guard,
      "department.deleted",
      "department",
      id,
      `${existing.name} (${existing._count.employees} employees unlinked)`,
    )
    return ok({ id })
  } catch {
    return fail("delete_failed", 500)
  }
}
