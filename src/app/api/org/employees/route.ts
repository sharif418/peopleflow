// GET /api/org/employees — paginated, searchable, org-scoped list
// POST /api/org/employees — create employee
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { employeeCreateSchema, zodError } from "../_lib/schemas"
import { EMPLOYEE_INCLUDE, audit, isPrismaKnownError, nextEmployeeCode, verifyRelations } from "../_lib/helpers"

const STATUS_VALUES = new Set(["active", "probation", "suspended", "inactive"])

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const departmentId = searchParams.get("departmentId")?.trim() ?? ""
  const status = searchParams.get("status")?.trim() ?? ""
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 12))

  const where: Prisma.EmployeeWhereInput = { organizationId: guard.org.id }
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { employeeCode: { contains: q } },
    ]
  }
  if (departmentId) where.departmentId = departmentId
  if (STATUS_VALUES.has(status)) where.status = status

  try {
    const [items, total, nextCode] = await Promise.all([
      db.employee.findMany({
        where,
        orderBy: { dateOfJoining: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: EMPLOYEE_INCLUDE,
      }),
      db.employee.count({ where }),
      nextEmployeeCode(guard.org.id),
    ])
    return ok({ items, total, page, pageSize, nextCode })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = employeeCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const data = parsed.data

  const relError = await verifyRelations(guard.org.id, data)
  if (relError) return fail(relError, 400)

  const employeeCode =
    data.employeeCode && data.employeeCode.length > 0
      ? data.employeeCode
      : await nextEmployeeCode(guard.org.id)

  try {
    const created = await db.employee.create({
      data: {
        organizationId: guard.org.id,
        employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        gender: data.gender ?? null,
        dateOfJoining: data.dateOfJoining,
        employmentType: data.employmentType,
        status: data.status,
        monthlySalary: data.monthlySalary ?? null,
        departmentId: data.departmentId ?? null,
        designationId: data.designationId ?? null,
        branchId: data.branchId ?? null,
        shiftId: data.shiftId ?? null,
      },
      include: EMPLOYEE_INCLUDE,
    })

    await audit(
      guard,
      "employee.created",
      "employee",
      created.id,
      `${created.employeeCode} ${created.firstName} ${created.lastName}`,
    )
    return ok(created, 201)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("code_taken", 409)
    return fail("create_failed", 500)
  }
}
