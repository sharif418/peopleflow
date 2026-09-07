// PATCH /api/org/employees/[id] — partial update (org-scoped)
// DELETE /api/org/employees/[id] — delete (org-scoped)
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { employeePatchSchema, zodError } from "../../_lib/schemas"
import { EMPLOYEE_INCLUDE, audit, isPrismaKnownError, verifyRelations } from "../../_lib/helpers"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.employee.findFirst({
    where: { id, organizationId: guard.org.id },
    select: { id: true },
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = employeePatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const data = parsed.data

  const relError = await verifyRelations(guard.org.id, data)
  if (relError) return fail(relError, 400)

  if (data.employeeCode) {
    const clash = await db.employee.findFirst({
      where: { organizationId: guard.org.id, employeeCode: data.employeeCode, NOT: { id } },
      select: { id: true },
    })
    if (clash) return fail("code_taken", 409)
  }

  try {
    const update: Record<string, unknown> = {}
    if (data.firstName !== undefined) update.firstName = data.firstName
    if (data.lastName !== undefined) update.lastName = data.lastName
    if (data.employeeCode !== undefined) update.employeeCode = data.employeeCode || null
    if (data.email !== undefined) update.email = data.email ?? null
    if (data.phone !== undefined) update.phone = data.phone ?? null
    if (data.gender !== undefined) update.gender = data.gender ?? null
    if (data.dateOfJoining !== undefined) update.dateOfJoining = data.dateOfJoining
    if (data.employmentType !== undefined) update.employmentType = data.employmentType
    if (data.status !== undefined) update.status = data.status
    if (data.monthlySalary !== undefined) update.monthlySalary = data.monthlySalary ?? null
    if (data.departmentId !== undefined) update.departmentId = data.departmentId ?? null
    if (data.designationId !== undefined) update.designationId = data.designationId ?? null
    if (data.branchId !== undefined) update.branchId = data.branchId ?? null
    if (data.shiftId !== undefined) update.shiftId = data.shiftId ?? null

    const updated = await db.employee.update({
      where: { id },
      data: update,
      include: EMPLOYEE_INCLUDE,
    })

    await audit(
      guard,
      "employee.updated",
      "employee",
      id,
      `${updated.employeeCode} ${updated.firstName} ${updated.lastName}`,
    )
    return ok(updated)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("code_taken", 409)
    return fail("update_failed", 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.employee.findFirst({
    where: { id, organizationId: guard.org.id },
  })
  if (!existing) return fail("not_found", 404)

  try {
    await db.employee.delete({ where: { id } })
    await audit(
      guard,
      "employee.deleted",
      "employee",
      id,
      `${existing.employeeCode} ${existing.firstName} ${existing.lastName}`,
    )
    return ok({ id })
  } catch {
    return fail("delete_failed", 500)
  }
}
