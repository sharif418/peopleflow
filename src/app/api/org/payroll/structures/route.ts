// GET /api/org/payroll/structures — list with components + payslip usage
// POST /api/org/payroll/structures — create (first one becomes default if none exists)
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../_lib/helpers"
import { structureCreateSchema, componentRules, zodError } from "../_lib/schemas"

const STRUCTURE_INCLUDE = {
  // Note: SalaryComponent has no createdAt — SQLite returns rows in insertion
  // (rowid) order, which preserves the component order the user defined.
  components: true,
  _count: { select: { payslips: true } },
} as const

export async function GET() {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  try {
    const structures = await db.salaryStructure.findMany({
      where: { organizationId: guard.org.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: STRUCTURE_INCLUDE,
    })
    return ok(
      structures.map((s) => ({
        id: s.id,
        name: s.name,
        isDefault: s.isDefault,
        createdAt: s.createdAt,
        payslipsCount: s._count.payslips,
        components: s.components.map((c) => ({
          id: c.id,
          name: c.name,
          abbr: c.abbr,
          type: c.type,
          calcType: c.calcType,
          value: c.value,
        })),
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

  const parsed = structureCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const { name, components } = parsed.data

  const ruleError = componentRules(components)
  if (ruleError) return fail(ruleError, 400)

  const existingCount = await db.salaryStructure.count({ where: { organizationId: guard.org.id } })
  const isDefault = existingCount === 0

  try {
    const created = await db.salaryStructure.create({
      data: {
        organizationId: guard.org.id,
        name,
        isDefault,
        components: {
          create: components.map((c) => ({
            name: c.name,
            abbr: c.abbr,
            type: c.type,
            calcType: c.calcType,
            value: c.value,
          })),
        },
      },
      include: STRUCTURE_INCLUDE,
    })
    await audit(guard, "payroll.structure.created", "salary_structure", created.id, name)
    return ok(
      {
        id: created.id,
        name: created.name,
        isDefault: created.isDefault,
        createdAt: created.createdAt,
        payslipsCount: created._count.payslips,
        components: created.components.map((c) => ({
          id: c.id,
          name: c.name,
          abbr: c.abbr,
          type: c.type,
          calcType: c.calcType,
          value: c.value,
        })),
      },
      201,
    )
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("name_taken", 409)
    return fail("create_failed", 500)
  }
}
