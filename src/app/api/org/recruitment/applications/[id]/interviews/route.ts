// GET /api/org/recruitment/applications/[id]/interviews — history (rounds asc)
// POST /api/org/recruitment/applications/[id]/interviews — schedule a round
//   { round 1..10, mode onsite|phone|video, scheduledAt "YYYY-MM-DDTHH:MM", interviewer? }
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../../../_lib/helpers"
import { INTERVIEW_INCLUDE, isTerminalStage, parseLocalDateTime } from "../../../_lib/helpers"
import { interviewCreateSchema, zodRecruitmentError } from "../../../_lib/schemas"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const application = await db.jobApplication.findFirst({
    where: { id, organizationId: guard.org.id },
    select: { id: true },
  })
  if (!application) return fail("not_found", 404)

  try {
    const items = await db.interview.findMany({
      where: { applicationId: id },
      orderBy: { scheduledAt: "asc" },
    })
    return ok({ items })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const application = await db.jobApplication.findFirst({
    where: { id, organizationId: guard.org.id },
    select: { id: true, candidateName: true, stage: true },
  })
  if (!application) return fail("not_found", 404)
  if (isTerminalStage(application.stage)) return fail("terminal_stage", 409)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = interviewCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodRecruitmentError(parsed.error), 400)
  const data = parsed.data

  const scheduledAt = parseLocalDateTime(data.scheduledAt)
  if (!scheduledAt) return fail("invalid_datetime", 400)
  if (scheduledAt.getTime() < Date.now()) return fail("past_datetime", 400)

  const clash = await db.interview.findFirst({
    where: { applicationId: id, round: data.round },
    select: { id: true },
  })
  if (clash) return fail("round_taken", 409)

  try {
    const created = await db.interview.create({
      data: {
        organizationId: guard.org.id,
        applicationId: id,
        round: data.round,
        mode: data.mode,
        scheduledAt,
        interviewer: data.interviewer ?? null,
      },
      include: INTERVIEW_INCLUDE,
    })
    await audit(
      guard,
      "recruitment.interview.scheduled",
      "interview",
      created.id,
      `${application.candidateName} R${created.round} ${created.mode} @ ${scheduledAt.toISOString()}`,
    )
    return ok(created, 201)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("round_taken", 409)
    return fail("create_failed", 500)
  }
}
