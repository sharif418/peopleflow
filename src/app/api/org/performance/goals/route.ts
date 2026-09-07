// GET /api/org/performance/goals — list with filters (status, employeeId, q)
//   + computed progress% / overdue / due-soon flags + org summary counts.
// POST /api/org/performance/goals — create a goal (employee verified in org).
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit } from "../../_lib/helpers"
import { GOAL_INCLUDE, goalComputedRow, todayIso } from "../_lib/helpers"
import { goalCreateSchema, zodPerfError } from "../_lib/schemas"

const STATUS_VALUES = new Set(["active", "completed", "cancelled", "overdue"])

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const statusParam = (searchParams.get("status") ?? "").trim()
  const employeeId = searchParams.get("employeeId")?.trim() ?? ""
  const q = searchParams.get("q")?.trim() ?? ""

  const statusList = statusParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => STATUS_VALUES.has(s))

  const today = todayIso()
  const where: Prisma.GoalWhereInput = { organizationId: guard.org.id }
  if (statusList.includes("overdue")) {
    // "overdue" is a computed view: active goals whose dueDate has passed.
    const rest = statusList.filter((s) => s !== "overdue")
    const overdueCond: Prisma.GoalWhereInput = { status: "active", dueDate: { lt: today } }
    where.AND = rest.length > 0 ? [{ OR: [overdueCond, { status: { in: rest } }] }] : [overdueCond]
  } else if (statusList.length > 0) {
    where.status = { in: statusList }
  }
  if (employeeId) where.employeeId = employeeId
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      {
        employee: {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { employeeCode: { contains: q } },
          ],
        },
      },
    ]
  }

  try {
    const [rows, allRows] = await Promise.all([
      db.goal.findMany({
        where,
        include: GOAL_INCLUDE,
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      }),
      db.goal.findMany({
        where: { organizationId: guard.org.id },
        select: { status: true, dueDate: true, targetValue: true, currentValue: true },
      }),
    ])

    // Active goals first (progress lives there), then by due date.
    const sorted = [
      ...rows.filter((r) => r.status === "active"),
      ...rows.filter((r) => r.status !== "active"),
    ]
    const items = sorted.map((r) => goalComputedRow(r, today))

    // Org-wide summary (independent of filters).
    let active = 0
    let completed = 0
    let cancelled = 0
    let overdue = 0
    let progressSum = 0
    for (const r of allRows) {
      if (r.status === "completed") completed++
      else if (r.status === "cancelled") cancelled++
      else {
        active++
        if (r.dueDate < today) overdue++
        if (r.targetValue > 0) {
          progressSum += Math.min(1, Math.max(0, r.currentValue / r.targetValue))
        }
      }
    }

    return ok({
      items,
      total: items.length,
      today,
      summary: {
        active,
        completed,
        cancelled,
        overdue,
        avgProgressPercent: active > 0 ? Math.round((progressSum / active) * 100) : 0,
      },
    })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = goalCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodPerfError(parsed.error), 400)
  const data = parsed.data

  const employee = await db.employee.findFirst({
    where: { id: data.employeeId, organizationId: guard.org.id },
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  })
  if (!employee) return fail("invalid_employee", 400)

  try {
    const created = await db.goal.create({
      data: {
        organizationId: guard.org.id,
        employeeId: employee.id,
        title: data.title,
        description: data.description ?? null,
        unit: data.unit,
        targetValue: data.targetValue,
        currentValue: data.currentValue,
        startDate: data.startDate,
        dueDate: data.dueDate,
        weight: data.weight,
        status: "active",
      },
      include: GOAL_INCLUDE,
    })
    await audit(
      guard,
      "performance.goal.created",
      "goal",
      created.id,
      `${employee.employeeCode} ${employee.firstName} ${employee.lastName} — ${data.title} (${data.unit} ${data.targetValue})`,
    )
    return ok(goalComputedRow(created), 201)
  } catch {
    return fail("create_failed", 500)
  }
}
