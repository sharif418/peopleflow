// GET /api/org/recruitment/jobs — list postings (status / q / departmentId filters)
// POST /api/org/recruitment/jobs — create a posting (validates org relations)
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../_lib/helpers"
import { JOB_POSTING_INCLUDE, JOB_STATUSES, endOfDay, todayIso, verifyJobRelations } from "../_lib/helpers"
import { jobPostingCreateSchema, zodRecruitmentError } from "../_lib/schemas"

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const statusParam = (searchParams.get("status") ?? "").trim()
  const q = searchParams.get("q")?.trim() ?? ""
  const departmentId = searchParams.get("departmentId")?.trim() ?? ""

  const statusList = statusParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => (JOB_STATUSES as readonly string[]).includes(s))

  const where: Prisma.JobPostingWhereInput = { organizationId: guard.org.id }
  if (statusList.length > 0) where.status = { in: statusList }
  if (departmentId) where.departmentId = departmentId
  if (q) {
    where.OR = [{ title: { contains: q } }, { description: { contains: q } }]
  }

  try {
    const items = await db.jobPosting.findMany({
      where,
      include: JOB_POSTING_INCLUDE,
      orderBy: [{ status: "desc" }, { postedAt: "desc" }],
    })
    return ok({ items })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = jobPostingCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodRecruitmentError(parsed.error), 400)
  const data = parsed.data

  const relationError = await verifyJobRelations(guard.org.id, {
    departmentId: data.departmentId ?? null,
    designationId: data.designationId ?? null,
  })
  if (relationError) return fail(relationError, 400)

  if (data.closesAt && data.closesAt < todayIso()) return fail("past_closes_at", 400)

  try {
    const created = await db.jobPosting.create({
      data: {
        organizationId: guard.org.id,
        title: data.title,
        departmentId: data.departmentId ?? null,
        designationId: data.designationId ?? null,
        employmentType: data.employmentType,
        vacancies: data.vacancies,
        description: data.description ?? null,
        closesAt: data.closesAt ? endOfDay(data.closesAt) : null,
        status: "open",
      },
      include: JOB_POSTING_INCLUDE,
    })
    await audit(guard, "recruitment.job.created", "job_posting", created.id, `${created.title} (${created.vacancies})`)
    return ok(created, 201)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("conflict", 409)
    return fail("create_failed", 500)
  }
}
