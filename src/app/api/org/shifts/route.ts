// GET /api/org/shifts — list (with employee counts)
// POST /api/org/shifts — create
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { shiftSchema, zodError } from "../_lib/schemas"
import { audit } from "../_lib/helpers"

export async function GET() {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  try {
    const rows = await db.shift.findMany({
      where: { organizationId: guard.org.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { employees: true } } },
    })
    return ok(
      rows.map((s) => ({
        id: s.id,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        employeesCount: s._count.employees,
        createdAt: s.createdAt,
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
  const parsed = shiftSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)

  const name = parsed.data.name.trim()
  const existing = await db.shift.findFirst({
    where: { organizationId: guard.org.id, name },
    select: { id: true },
  })
  if (existing) return fail("name_taken", 409)

  try {
    const created = await db.shift.create({
      data: {
        organizationId: guard.org.id,
        name,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
      },
    })
    await audit(
      guard,
      "shift.created",
      "shift",
      created.id,
      `${name} ${created.startTime}-${created.endTime}`,
    )
    return ok(
      {
        id: created.id,
        name: created.name,
        startTime: created.startTime,
        endTime: created.endTime,
        employeesCount: 0,
        createdAt: created.createdAt,
      },
      201,
    )
  } catch {
    return fail("create_failed", 500)
  }
}
