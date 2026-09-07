// GET /api/org/recruitment/applications/[id] — detail + interview history
// PATCH /api/org/recruitment/applications/[id] — stage transition (state-machine
//   validated), rating 0-5, internal notes
// DELETE /api/org/recruitment/applications/[id] — only in "applied" stage
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../../_lib/helpers"
import { JOB_APPLICATION_INCLUDE, canTransition, isTerminalStage } from "../../_lib/helpers"
import { applicationPatchSchema, zodRecruitmentError } from "../../_lib/schemas"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  try {
    const application = await db.jobApplication.findFirst({
      where: { id, organizationId: guard.org.id },
      include: {
        ...JOB_APPLICATION_INCLUDE,
        interviews: { orderBy: { scheduledAt: "asc" } },
      },
    })
    if (!application) return fail("not_found", 404)
    return ok(application)
  } catch {
    return fail("list_failed", 500)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.jobApplication.findFirst({
    where: { id, organizationId: guard.org.id },
    include: JOB_APPLICATION_INCLUDE,
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = applicationPatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodRecruitmentError(parsed.error), 400)
  const data = parsed.data

  if (data.stage !== undefined && data.stage !== existing.stage) {
    if (isTerminalStage(existing.stage)) return fail("terminal_stage", 409)
    if (!canTransition(existing.stage, data.stage)) return fail("invalid_stage", 409)
  }

  const update: Record<string, unknown> = {}
  if (data.stage !== undefined) update.stage = data.stage
  if (data.rating !== undefined) update.rating = data.rating
  if (data.notes !== undefined) update.notes = data.notes

  try {
    const updated = await db.jobApplication.update({
      where: { id },
      data: update,
      include: { ...JOB_APPLICATION_INCLUDE, interviews: { orderBy: { scheduledAt: "asc" } } },
    })

    if (data.stage !== undefined && data.stage !== existing.stage) {
      await audit(
        guard,
        "recruitment.application.stage_changed",
        "job_application",
        id,
        `${existing.candidateName}: ${existing.stage} → ${data.stage}`,
      )
    } else {
      await audit(
        guard,
        "recruitment.application.updated",
        "job_application",
        id,
        `${existing.candidateName}${data.rating !== undefined ? ` rating=${data.rating}` : ""}${data.notes !== undefined ? " notes" : ""}`,
      )
    }
    return ok(updated)
  } catch (x) {
    if (isPrismaKnownError(x) && (x.code === "P2025" || x.code === "P2023")) return fail("not_found", 404)
    return fail("update_failed", 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.jobApplication.findFirst({
    where: { id, organizationId: guard.org.id },
  })
  if (!existing) return fail("not_found", 404)

  if (existing.stage !== "applied") return fail("not_in_applied", 409)

  try {
    await db.jobApplication.delete({ where: { id } })
    await audit(
      guard,
      "recruitment.application.deleted",
      "job_application",
      id,
      existing.candidateName,
    )
    return ok({ id })
  } catch {
    return fail("delete_failed", 500)
  }
}
