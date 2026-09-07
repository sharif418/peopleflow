"use client"

// Appraisal review dialog — the 5 fixed criteria rows (Bengali labels) with
// 1-5 star ratings + comments, live overall score, reviewer note, and the
// status flow: draft → in_review (submit) → final (finalize, locked).
// The form is a keyed child seeded from the server row (fresh after each save).
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, Lock, Loader2, Send, Star } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  APPRAISAL_CRITERIA,
  PERFORMANCE_ENDPOINTS,
  performanceKeys,
  type AppraisalRow,
} from "./types"
import {
  appraisalStatusBadgeClass,
  appraisalStatusLabel,
  criterionLabel,
  performanceErrorMessage,
  scoreColorClass,
} from "./utils"
import { StarRating } from "./star-rating"

type ReviewAction = "save" | "submit" | "finalize"

interface ReviewPayload {
  items: { criterion: string; score: number; comment: string | null }[]
  reviewerNote: string | null
}

export function AppraisalReviewDialog({
  open,
  onOpenChange,
  appraisalId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appraisalId: string
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [finalizePayload, setFinalizePayload] = useState<ReviewPayload | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: performanceKeys.appraisalDetail(appraisalId),
    queryFn: () => apiFetch<AppraisalRow>(PERFORMANCE_ENDPOINTS.appraisalItem(appraisalId)),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: (vars: { action: ReviewAction } & ReviewPayload) =>
      apiFetch<AppraisalRow>(PERFORMANCE_ENDPOINTS.appraisalItem(appraisalId), {
        method: "PATCH",
        body: JSON.stringify({
          items: vars.items,
          reviewerNote: vars.reviewerNote,
          ...(vars.action === "submit" ? { action: "submit" } : vars.action === "finalize" ? { action: "finalize" } : {}),
        }),
      }),
    onSuccess: (_row, vars) => {
      toast.success(
        vars.action === "submit"
          ? t("portal.performance.toasts.appraisalSubmitted")
          : vars.action === "finalize"
            ? t("portal.performance.toasts.appraisalFinalized")
            : t("portal.performance.toasts.appraisalSaved"),
      )
      if (vars.action !== "save") onOpenChange(false)
    },
    onError: (err: Error) => {
      const mapped = performanceErrorMessage(err, t)
      toast.error(mapped ?? t("portal.performance.toasts.failed"))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: performanceKeys.all })
    },
  })

  const name = data ? `${data.employee.firstName} ${data.employee.lastName}` : ""

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!mutation.isPending) onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto pf-scrollbar">
        <DialogHeader>
          <DialogTitle>{t("portal.performance.appraisalReview.title")}</DialogTitle>
          <DialogDescription>
            {data ? t("portal.performance.appraisalReview.desc", { name, period: data.period }) : "…"}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm font-medium text-destructive">{t("common.error")}</p>
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : (
          <ReviewForm
            key={`${data.id}:${data.updatedAt}`}
            data={data}
            busy={mutation.isPending}
            busyAction={mutation.variables?.action ?? null}
            onSubmit={(action, payload) => mutation.mutate({ action, ...payload })}
            onRequestFinalize={(payload) => setFinalizePayload(payload)}
          />
        )}
      </DialogContent>

      <ConfirmDialog
        open={finalizePayload !== null}
        onOpenChange={(o) => {
          if (!o) setFinalizePayload(null)
        }}
        title={t("portal.performance.appraisalReview.finalizeTitle")}
        description={t("portal.performance.appraisalReview.finalizeDesc")}
        confirmLabel={t("portal.performance.appraisalReview.confirmFinalize")}
        cancelLabel={t("portal.common.cancel")}
        destructive={false}
        onConfirm={() => {
          if (finalizePayload) {
            mutation.mutate({ action: "finalize", ...finalizePayload })
            setFinalizePayload(null)
          }
        }}
      />
    </Dialog>
  )
}

function ReviewForm({
  data,
  busy,
  busyAction,
  onSubmit,
  onRequestFinalize,
}: {
  data: AppraisalRow
  busy: boolean
  busyAction: ReviewAction | null
  onSubmit: (action: ReviewAction, payload: ReviewPayload) => void
  onRequestFinalize: (payload: ReviewPayload) => void
}) {
  const { lang, t } = useI18n()
  const isFinal = data.status === "final"
  const name = `${data.employee.firstName} ${data.employee.lastName}`

  // Draft state seeded once per mount (keyed by id:updatedAt in the parent).
  const [drafts, setDrafts] = useState<Record<string, { score: number; comment: string }>>(() => {
    const next: Record<string, { score: number; comment: string }> = {}
    for (const c of APPRAISAL_CRITERIA) {
      const item = data.items.find((i) => i.criterion === c)
      next[c] = { score: item?.score ?? 3, comment: item?.comment ?? "" }
    }
    return next
  })
  const [reviewerNote, setReviewerNote] = useState(data.reviewerNote ?? "")

  const overall = useMemo(() => {
    const values = Object.values(drafts).map((d) => d.score)
    if (values.length === 0) return 0
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  }, [drafts])

  const setScore = (criterion: string, score: number) => {
    setDrafts((prev) => ({ ...prev, [criterion]: { ...(prev[criterion] ?? { score: 3, comment: "" }), score } }))
  }
  const setComment = (criterion: string, comment: string) => {
    setDrafts((prev) => ({ ...prev, [criterion]: { ...(prev[criterion] ?? { score: 3, comment: "" }), comment } }))
  }

  const buildPayload = (): ReviewPayload => ({
    items: APPRAISAL_CRITERIA.map((c) => ({
      criterion: c,
      score: drafts[c]?.score ?? 3,
      comment: drafts[c]?.comment.trim() || null,
    })),
    reviewerNote: reviewerNote.trim() || null,
  })

  return (
    <div className="space-y-4">
      {/* Employee + status + overall */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/40 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="font-mono text-xs text-muted-foreground">{data.employee.employeeCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Star className="size-4 fill-primary text-primary" aria-hidden />
            <span className={cn("text-sm font-semibold tabular-nums", scoreColorClass(overall))}>
              {t("portal.performance.appraisals.outOfFive", { score: formatNumber(overall, lang) })}
            </span>
          </div>
          <Badge variant="outline" className={cn("whitespace-nowrap", appraisalStatusBadgeClass(data.status))}>
            {appraisalStatusLabel(data.status, t)}
          </Badge>
        </div>
      </div>

      {isFinal && (
        <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success">
          <Lock className="size-4" aria-hidden />
          {t("portal.performance.appraisalReview.lockedNote")}
        </p>
      )}

      {/* Criteria rows */}
      <fieldset disabled={isFinal || busy} className="space-y-3">
        <legend className="sr-only">{t("portal.performance.appraisalReview.criteriaHeading")}</legend>
        {APPRAISAL_CRITERIA.map((c) => (
          <div key={c} className="rounded-xl border border-border/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm font-semibold">{criterionLabel(c, t)}</Label>
              <StarRating
                value={drafts[c]?.score ?? 3}
                onChange={(score) => setScore(c, score)}
                disabled={isFinal}
                label={`${criterionLabel(c, t)} — ${t("portal.performance.appraisalReview.scoreLabel")}`}
              />
            </div>
            <Input
              className="mt-2 h-10"
              placeholder={t("portal.performance.appraisalReview.commentPh")}
              maxLength={300}
              value={drafts[c]?.comment ?? ""}
              onChange={(e) => setComment(c, e.target.value)}
              aria-label={`${criterionLabel(c, t)} — ${t("portal.performance.appraisalReview.commentLabel")}`}
            />
          </div>
        ))}
      </fieldset>

      {/* Notes */}
      {data.selfNote && (
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t("portal.performance.appraisalReview.selfNote")}: </span>
          {data.selfNote}
        </div>
      )}
      {!isFinal ? (
        <div className="space-y-2">
          <Label htmlFor="reviewer-note">{t("portal.performance.appraisalReview.reviewerNote")}</Label>
          <Textarea
            id="reviewer-note"
            className="min-h-20"
            placeholder={t("portal.performance.appraisalReview.reviewerNotePh")}
            maxLength={500}
            value={reviewerNote}
            onChange={(e) => setReviewerNote(e.target.value)}
          />
        </div>
      ) : (
        data.reviewerNote && (
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("portal.performance.appraisalReview.reviewerNote")}:{" "}
            </span>
            {data.reviewerNote}
          </div>
        )
      )}

      {/* Actions by status */}
      {!isFinal && (
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="outline" className="h-10" disabled={busy} onClick={() => onSubmit("save", buildPayload())}>
            {busy && busyAction === "save" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t("portal.performance.appraisalReview.save")}
          </Button>
          {data.status === "draft" ? (
            <Button className="h-10" disabled={busy} onClick={() => onSubmit("submit", buildPayload())}>
              {busy && busyAction === "submit" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {t("portal.performance.appraisalReview.submitForReview")}
            </Button>
          ) : (
            <Button className="h-10" disabled={busy} onClick={() => onRequestFinalize(buildPayload())}>
              <CheckCircle2 className="size-4" aria-hidden />
              {t("portal.performance.appraisalReview.finalize")}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
