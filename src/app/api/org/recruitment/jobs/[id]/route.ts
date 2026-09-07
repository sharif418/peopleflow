// GET /api/org/recruitment/jobs/[id] — posting detail + its applications
// PATCH /api/org/recruitment/jobs/[id] — update fields / status (open|on_hold|closed)
// DELETE /api/org/recruitment/jobs/[id] — only when no applications exist
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../../_lib/helpers"
import { JOB_POSTING_INCLUDE, endOfDay, todayIso, verifyJobRelations } from "../../_lib/helpers"
import { jobPostingPatchSchema, zodRecruitmentError } from "../../_lib/schemas"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  try {
    const job = await db.jobPosting.findFirst({
      where: { id, organizationId: guard.org.id },
      include: {
        ...JOB_POSTING_INCLUDE,
        applications: {
          select: {
            id: true,
            candidateName: true,
            candidatePhone: true,
            candidateEmail: true,
            expectedSalary: true,
            stage: true,
            rating: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })
    if (!job) return fail("not_found", 404)
    return ok(job)
  } catch {
    return fail("list_failed", 500)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.jobPosting.findFirst({
    where: { id, organizationId: guard.org.id },
  })
  if (!existing) return fail("not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = jobPostingPatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodRecruitmentError(parsed.error), 400)
  const data = parsed.data

  const relationError = await verifyJobRelations(guard.org.id, {
    departmentId: data.departmentId ?? null,
    designationId: data.designationId ?? null,
  })
  if (relationError) return fail(relationError, 400)

  if (data.closesAt && data.closesAt < todayIso()) return fail("past_closes_at", 400)

  const update: Record<string, unknown> = {}
  if (data.title !== undefined) update.title = data.title
  if (data.departmentId !== undefined) update.departmentId = data.departmentId
  if (data.designationId !== undefined) update.designationId = data.designationId
  if (data.employmentType !== undefined) update.employmentType = data.employmentType
  if (data.vacancies !== undefined) update.vacancies = data.vacancies
  if (data.description !== undefined) update.description = data.description
  if (data.status !== undefined) update.status = data.status
  if (data.closesAt !== undefined) update.closesAt = data.closesAt ? endOfDay(data.closesAt) : null

  try {
    const updated = await db.jobPosting.update({
      where: { id },
      data: update,
      include: JOB_POSTING_INCLUDE,
    })
    const statusChanged = data.status !== undefined && data.status !== existing.status
    await audit(
      guard,
      statusChanged ? "recruitment.job.status_changed" : "recruitment.job.updated",
      "job_posting",
      id,
      `${updated.title}${statusChanged ? ` → ${data.status}` : ""}`,
    )
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

  const existing = await db.jobPosting.findFirst({
    where: { id, organizationId: guard.org.id },
  })
  if (!existing) return fail("not_found", 404)

  const applications = await db.jobApplication.count({ where: { jobPostingId: id } })
  if (applications > 0) return fail("in_use", 409)

  try {
    await db.jobPosting.delete({ where: { id } })
    await audit(guard, "recruitment.job.deleted", "job_posting", id, existing.title)
    return ok({ id })
  } catch {
    return fail("delete_failed", 500)
  }
}
