// GET /api/org/departments — list (with employee counts)
// POST /api/org/departments — create
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { departmentSchema, zodError } from "../_lib/schemas"
import { audit } from "../_lib/helpers"

export async function GET() {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  try {
    const rows = await db.department.findMany({
      where: { organizationId: guard.org.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { employees: true } } },
    })
    return ok(
      rows.map((d) => ({
        id: d.id,
        name: d.name,
        employeesCount: d._count.employees,
        createdAt: d.createdAt,
      })),
    )
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)
  const parsed = departmentSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)

  const name = parsed.data.name.trim()
  const existing = await db.department.findFirst({
    where: { organizationId: guard.org.id, name },
    select: { id: true },
  })
  if (existing) return fail("name_taken", 409)

  try {
    const created = await db.department.create({
      data: { organizationId: guard.org.id, name },
    })
    await audit(guard, "department.created", "department", created.id, name)
    return ok({ id: created.id, name: created.name, employeesCount: 0, createdAt: created.createdAt }, 201)
  } catch {
    return fail("create_failed", 500)
  }
}
