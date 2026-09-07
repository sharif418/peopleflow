// PATCH /api/org/recruitment/applications/[id]/interviews/[interviewId]
//   { feedback?, result pending|pass|fail }
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../../../../_lib/helpers"
import { INTERVIEW_INCLUDE } from "../../../../_lib/helpers"
import { interviewPatchSchema, zodRecruitmentError } from "../../../../_lib/schemas"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; interviewId: string }> },
) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id, interviewId } = await params

  const application = await db.jobApplication.findFirst({
    where: { id, organizationId: guard.org.id },
    select: { id: true, candidateName: true },
  })
  if (!application) return fail("not_found", 404)

  const existing = await db.interview.findFirst({
    where: { id: interviewId, applicationId: id },
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = interviewPatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodRecruitmentError(parsed.error), 400)
  const data = parsed.data

  const update: Record<string, unknown> = {}
  if (data.feedback !== undefined) update.feedback = data.feedback
  if (data.result !== undefined) update.result = data.result

  try {
    const updated = await db.interview.update({
      where: { id: interviewId },
      data: update,
      include: INTERVIEW_INCLUDE,
    })
    await audit(
      guard,
      "recruitment.interview.updated",
      "interview",
      interviewId,
      `${application.candidateName} R${existing.round}${data.result !== undefined ? ` → ${data.result}` : ""}`,
    )
    return ok(updated)
  } catch (x) {
    if (isPrismaKnownError(x) && (x.code === "P2025" || x.code === "P2023")) return fail("not_found", 404)
    return fail("update_failed", 500)
  }
}
