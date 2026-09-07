// POST /api/org/setup — first-run wizard: bulk create depts/desigs/shifts/employees
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { setupSchema, zodError } from "../_lib/schemas"
import { audit, nextEmployeeCode } from "../_lib/helpers"

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const orgId = guard.org.id

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)
  const parsed = setupSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const data = parsed.data

  try {
    // Departments (skip names that already exist)
    const createdDeptIds = new Map<string, string>()
    let departments = 0
    for (const d of data.departments) {
      const name = d.name.trim()
      if (!name) continue
      const existing = await db.department.findFirst({ where: { organizationId: orgId, name } })
      if (existing) {
        createdDeptIds.set(name, existing.id)
        continue
      }
      const row = await db.department.create({ data: { organizationId: orgId, name } })
      createdDeptIds.set(name, row.id)
      departments++
    }

    // Designations (skip duplicates)
    const createdDesigIds = new Map<string, string>()
    let designations = 0
    for (const d of data.designations) {
      const name = d.name.trim()
      if (!name) continue
      const existing = await db.designation.findFirst({ where: { organizationId: orgId, name } })
      if (existing) {
        createdDesigIds.set(name, existing.id)
        continue
      }
      const row = await db.designation.create({ data: { organizationId: orgId, name } })
      createdDesigIds.set(name, row.id)
      designations++
    }

    // Shifts (skip duplicates)
    const createdShiftIds = new Map<string, string>()
    let shifts = 0
    for (const s of data.shifts) {
      const name = s.name.trim()
      if (!name) continue
      const existing = await db.shift.findFirst({ where: { organizationId: orgId, name } })
      if (existing) {
        createdShiftIds.set(name, existing.id)
        continue
      }
      const row = await db.shift.create({
        data: { organizationId: orgId, name, startTime: s.startTime, endTime: s.endTime },
      })
      createdShiftIds.set(name, row.id)
      shifts++
    }

    // Employees (codes auto-generated in sequence)
    let employees = 0
    for (const e of data.employees ?? []) {
      const deptName = e.departmentName?.trim()
      const desigName = e.designationName?.trim()
      const shiftName = e.shiftName?.trim()
      await db.employee.create({
        data: {
          organizationId: orgId,
          employeeCode: await nextEmployeeCode(orgId),
          firstName: e.firstName,
          lastName: e.lastName,
          phone: e.phone ?? null,
          gender: e.gender ?? null,
          dateOfJoining: e.dateOfJoining,
          employmentType: e.employmentType,
          status: "active",
          monthlySalary: e.monthlySalary ?? null,
          departmentId: deptName ? (createdDeptIds.get(deptName) ?? null) : null,
          designationId: desigName ? (createdDesigIds.get(desigName) ?? null) : null,
          shiftId: shiftName ? (createdShiftIds.get(shiftName) ?? null) : null,
        },
      })
      employees++
    }

    // Mark setup complete
    await db.organization.update({ where: { id: orgId }, data: { setupCompleted: true } })

    await audit(
      guard,
      "setup.completed",
      "organization",
      orgId,
      `departments: ${departments}, designations: ${designations}, shifts: ${shifts}, employees: ${employees}`,
    )

    return ok({ departments, designations, shifts, employees })
  } catch {
    return fail("setup_failed", 500)
  }
}
