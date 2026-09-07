// GET /api/org/performance/appraisals/[id] — full detail (items in canonical order).
// PATCH /api/org/performance/appraisals/[id] — update item scores/comments,
//   selfNote, reviewerNote, and status transitions:
//   draft → in_review (action:"submit") → final (action:"finalize").
//   overallScore is recomputed on every item change. FINAL locks all editing.
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit } from "../../../_lib/helpers"
import { APPRAISAL_INCLUDE, computeOverallScore, orderAppraisalItems } from "../../_lib/helpers"
import { appraisalPatchSchema, zodPerfError } from "../../_lib/schemas"

/** Allowed status transitions: draft→in_review, in_review→final. */
const NEXT_STATUS: Record<string, string> = {
  draft: "in_review",
  in_review: "final",
}

const ACTION_STATUS: Record<string, string> = {
  submit: "in_review",
  finalize: "final",
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  try {
    const appraisal = await db.appraisal.findFirst({
      where: { id, organizationId: guard.org.id },
      include: APPRAISAL_INCLUDE,
    })
    if (!appraisal) return fail("not_found", 404)
    return ok({ ...appraisal, items: orderAppraisalItems(appraisal.items) })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.appraisal.findFirst({
    where: { id, organizationId: guard.org.id },
    include: APPRAISAL_INCLUDE,
  })
  if (!existing) return fail("not_found", 404)

  // Final appraisals are locked — no edits of any kind.
  if (existing.status === "final") return fail("locked", 409)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = appraisalPatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodPerfError(parsed.error), 400)
  const data = parsed.data

  // Status transition validation.
  let nextStatus = existing.status
  if (data.action) {
    const target = ACTION_STATUS[data.action]
    if (NEXT_STATUS[existing.status] !== target) return fail("invalid_transition", 409)
    nextStatus = target
  }

  try {
    // Upsert item scores/comments per criterion, then recompute overall.
    if (data.items && data.items.length > 0) {
      const byCriterion = new Map(existing.items.map((i) => [i.criterion, i]))
      for (const item of data.items) {
        const current = byCriterion.get(item.criterion)
        if (current) {
          await db.appraisalItem.update({
            where: { id: current.id },
            data: { score: item.score, comment: item.comment ?? null },
          })
        } else {
          await db.appraisalItem.create({
            data: {
              appraisalId: existing.id,
              criterion: item.criterion,
              score: item.score,
              comment: item.comment ?? null,
            },
          })
        }
      }
    }

    const refreshed = await db.appraisal.findUnique({
      where: { id: existing.id },
      include: APPRAISAL_INCLUDE,
    })
    if (!refreshed) return fail("not_found", 404)

    const overallScore = computeOverallScore(refreshed.items.map((i) => i.score))
    const updated = await db.appraisal.update({
      where: { id: existing.id },
      data: {
        overallScore,
        status: nextStatus,
        selfNote: data.selfNote !== undefined ? data.selfNote : existing.selfNote,
        reviewerNote: data.reviewerNote !== undefined ? data.reviewerNote : existing.reviewerNote,
      },
      include: APPRAISAL_INCLUDE,
    })

    await audit(
      guard,
      data.action
        ? `performance.appraisal.${data.action === "submit" ? "submitted" : "finalized"}`
        : "performance.appraisal.updated",
      "appraisal",
      existing.id,
      `${existing.employee.employeeCode} ${existing.employee.firstName} ${existing.employee.lastName} — ${existing.period}: ${overallScore}/5 (${nextStatus})`,
    )

    return ok({ ...updated, items: orderAppraisalItems(updated.items) })
  } catch {
    return fail("update_failed", 500)
  }
}
