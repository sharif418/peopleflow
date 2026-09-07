// GET /api/org/performance/appraisals — paginated list (8/page) with filters
//   (status, employeeId, period), employee + items included + summary counts.
// POST /api/org/performance/appraisals — create a draft appraisal
//   (employeeId, period "2026-H1" unique per employee, items for the 5 fixed
//   criteria; overallScore = average of item scores).
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../_lib/helpers"
import {
  APPRAISAL_CRITERIA,
  APPRAISAL_INCLUDE,
  computeOverallScore,
  orderAppraisalItems,
} from "../_lib/helpers"
import { appraisalCreateSchema, zodPerfError } from "../_lib/schemas"

const PAGE_SIZE = 8
const STATUS_VALUES = new Set(["draft", "in_review", "final"])

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const statusParam = (searchParams.get("status") ?? "").trim()
  const employeeId = searchParams.get("employeeId")?.trim() ?? ""
  const period = searchParams.get("period")?.trim() ?? ""
  const q = searchParams.get("q")?.trim() ?? ""
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  const statusList = statusParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => STATUS_VALUES.has(s))

  const where: Prisma.AppraisalWhereInput = { organizationId: guard.org.id }
  if (statusList.length > 0) where.status = { in: statusList }
  if (employeeId) where.employeeId = employeeId
  if (period) where.period = period
  if (q) {
    where.OR = [
      { period: { contains: q } },
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
    const [rows, total, statusCounts, finalScores] = await Promise.all([
      db.appraisal.findMany({
        where,
        include: APPRAISAL_INCLUDE,
        orderBy: { createdAt: "desc" },
      }),
      db.appraisal.count({ where }),
      db.appraisal.groupBy({
        by: ["status"],
        where: { organizationId: guard.org.id },
        _count: { _all: true },
      }),
      db.appraisal.findMany({
        where: { organizationId: guard.org.id, status: "final" },
        select: { overallScore: true },
      }),
    ])

    // In-review first, then drafts, then final — work queue order.
    const rank: Record<string, number> = { in_review: 0, draft: 1, final: 2 }
    const sorted = [...rows].sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3))
    const safePage = Math.min(page, Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)))
    const pageItems = sorted
      .slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
      .map((a) => ({ ...a, items: orderAppraisalItems(a.items) }))

    const summary = {
      draft: statusCounts.find((s) => s.status === "draft")?._count._all ?? 0,
      inReview: statusCounts.find((s) => s.status === "in_review")?._count._all ?? 0,
      final: statusCounts.find((s) => s.status === "final")?._count._all ?? 0,
      avgFinalScore:
        finalScores.length > 0
          ? Math.round((finalScores.reduce((acc, s) => acc + s.overallScore, 0) / finalScores.length) * 100) / 100
          : 0,
    }

    return ok({ items: pageItems, total, page: safePage, pageSize: PAGE_SIZE, summary })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = appraisalCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodPerfError(parsed.error), 400)
  const data = parsed.data

  const employee = await db.employee.findFirst({
    where: { id: data.employeeId, organizationId: guard.org.id },
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  })
  if (!employee) return fail("invalid_employee", 400)

  // Items: provided subset or the full 5-criteria set at a neutral score of 3.
  const items =
    data.items ??
    APPRAISAL_CRITERIA.map((criterion) => ({ criterion, score: 3, comment: null as string | null }))

  try {
    const created = await db.appraisal.create({
      data: {
        organizationId: guard.org.id,
        employeeId: employee.id,
        period: data.period,
        overallScore: computeOverallScore(items.map((i) => i.score)),
        status: "draft",
        selfNote: data.selfNote ?? null,
        items: {
          create: items.map((i) => ({
            criterion: i.criterion,
            score: i.score,
            comment: i.comment ?? null,
          })),
        },
      },
      include: APPRAISAL_INCLUDE,
    })
    await audit(
      guard,
      "performance.appraisal.created",
      "appraisal",
      created.id,
      `${employee.employeeCode} ${employee.firstName} ${employee.lastName} — ${data.period} (${created.overallScore}/5)`,
    )
    return ok({ ...created, items: orderAppraisalItems(created.items) }, 201)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("period_taken", 409)
    return fail("create_failed", 500)
  }
}
