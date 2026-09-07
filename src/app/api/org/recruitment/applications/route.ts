// GET /api/org/recruitment/applications — pipeline inbox (stage/jobPostingId/q
//   filters, 12/page, pipeline-order sort) + org summary for the stats row.
// POST /api/org/recruitment/applications — add a candidate to a posting.
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../_lib/helpers"
import {
  JOB_APPLICATION_INCLUDE,
  STAGES,
  STAGE_RANK,
  upcomingInterviewCount,
} from "../_lib/helpers"
import { applicationCreateSchema, zodRecruitmentError } from "../_lib/schemas"

const PAGE_SIZE = 12

function sameLocalMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const stageParam = (searchParams.get("stage") ?? "").trim()
  const jobPostingId = searchParams.get("jobPostingId")?.trim() ?? ""
  const q = searchParams.get("q")?.trim() ?? ""
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  const stageList = stageParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => (STAGES as readonly string[]).includes(s))

  const where: Prisma.JobApplicationWhereInput = { organizationId: guard.org.id }
  if (stageList.length > 0) where.stage = { in: stageList }
  if (jobPostingId) where.jobPostingId = jobPostingId
  if (q) {
    where.OR = [
      { candidateName: { contains: q } },
      { candidateEmail: { contains: q } },
      { candidatePhone: { contains: q } },
    ]
  }

  try {
    const [rows, allApps, openJobs, upcomingInterviews] = await Promise.all([
      db.jobApplication.findMany({
        where,
        include: JOB_APPLICATION_INCLUDE,
        orderBy: { createdAt: "desc" },
      }),
      db.jobApplication.findMany({
        where: { organizationId: guard.org.id },
        select: { stage: true, updatedAt: true },
      }),
      db.jobPosting.count({ where: { organizationId: guard.org.id, status: "open" } }),
      upcomingInterviewCount(guard.org.id),
    ])

    // Pipeline order (applied first, terminal last), newest within each stage.
    const sorted = [...rows].sort((a, b) => {
      const rank = STAGE_RANK[a.stage] - STAGE_RANK[b.stage]
      return rank !== 0 ? rank : b.createdAt.getTime() - a.createdAt.getTime()
    })
    const total = sorted.length
    const safePage = Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)))
    const items = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

    // Org-wide summary (independent of filters).
    const now = new Date()
    let activePipeline = 0
    let hired = 0
    for (const a of allApps) {
      if (["applied", "screening", "interview", "offer"].includes(a.stage)) activePipeline++
      if (a.stage === "hired" && sameLocalMonth(a.updatedAt, now)) hired++
    }

    return ok({
      items,
      total,
      page: safePage,
      pageSize: PAGE_SIZE,
      summary: { openJobs, activePipeline, upcomingInterviews, hired },
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

  const parsed = applicationCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodRecruitmentError(parsed.error), 400)
  const data = parsed.data

  const job = await db.jobPosting.findFirst({
    where: { id: data.jobPostingId, organizationId: guard.org.id },
    select: { id: true, title: true, status: true },
  })
  if (!job) return fail("invalid_job", 404)
  if (job.status === "closed") return fail("job_closed", 409)

  try {
    const created = await db.jobApplication.create({
      data: {
        organizationId: guard.org.id,
        jobPostingId: job.id,
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail ?? null,
        candidatePhone: data.candidatePhone ?? null,
        expectedSalary: data.expectedSalary ?? null,
        coverNote: data.coverNote ?? null,
        stage: "applied",
      },
      include: JOB_APPLICATION_INCLUDE,
    })
    await audit(
      guard,
      "recruitment.application.created",
      "job_application",
      created.id,
      `${created.candidateName} → ${job.title}`,
    )
    return ok(created, 201)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("conflict", 409)
    return fail("create_failed", 500)
  }
}
