// PATCH /api/org/payroll/structures/[id] — rename / set default / replace components
// DELETE /api/org/payroll/structures/[id] — guarded (not default, not referenced)
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../../_lib/helpers"
import { structurePatchSchema, componentRules, zodError } from "../../_lib/schemas"

const STRUCTURE_INCLUDE = {
  // Note: SalaryComponent has no createdAt — SQLite returns rows in insertion
  // (rowid) order, which preserves the component order the user defined.
  components: true,
  _count: { select: { payslips: true } },
} as const

function serialize(s: {
  id: string
  name: string
  isDefault: boolean
  createdAt: Date
  components: { id: string; name: string; abbr: string; type: string; calcType: string; value: number }[]
  _count: { payslips: number }
}) {
  return {
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
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.salaryStructure.findFirst({
    where: { id, organizationId: guard.org.id },
    select: { id: true },
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = structurePatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const data = parsed.data

  if (data.components) {
    const ruleError = componentRules(data.components)
    if (ruleError) return fail(ruleError, 400)
  }

  try {
    if (data.isDefault === true) {
      await db.salaryStructure.updateMany({
        where: { organizationId: guard.org.id, isDefault: true },
        data: { isDefault: false },
      })
    }
    const updated = await db.salaryStructure.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      },
      include: STRUCTURE_INCLUDE,
    })

    if (data.components) {
      await db.salaryComponent.deleteMany({ where: { structureId: id } })
      await db.salaryComponent.createMany({
        data: data.components.map((c) => ({
          structureId: id,
          name: c.name,
          abbr: c.abbr,
          type: c.type,
          calcType: c.calcType,
          value: c.value,
        })),
      })
    }

    await audit(guard, "payroll.structure.updated", "salary_structure", id, updated.name)

    const fresh = await db.salaryStructure.findUniqueOrThrow({
      where: { id },
      include: STRUCTURE_INCLUDE,
    })
    return ok(serialize(fresh))
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("name_taken", 409)
    return fail("update_failed", 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.salaryStructure.findFirst({
    where: { id, organizationId: guard.org.id },
    include: { _count: { select: { payslips: true } } },
  })
  if (!existing) return fail("not_found", 404)
  if (existing.isDefault) return fail("is_default", 400)
  if (existing._count.payslips > 0) return fail("in_use", 400)

  try {
    await db.salaryStructure.delete({ where: { id } })
    await audit(guard, "payroll.structure.deleted", "salary_structure", id, existing.name)
    return ok({ id })
  } catch {
    return fail("delete_failed", 500)
  }
}
