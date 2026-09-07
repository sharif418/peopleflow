"use client"

// Candidate detail dialog — profile, rating editor, notes, stage transitions
// (advance/reject) + guarded delete. Profile blocks live in ./application-info,
// interview history + scheduling in ./interview-section.
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { BadgeCheck, Loader2, Trash2, XCircle } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  NEXT_STAGE,
  RECRUITMENT_ENDPOINTS,
  recruitmentKeys,
  type ApplicationDetail,
} from "./types"
import { recruitmentErrorMessage, stageLabel } from "./utils"
import { RatingEditor, ApplicationInfoGrid } from "./application-info"
import { InterviewSection } from "./interview-section"

export function ApplicationDetailDialog({
  applicationId,
  onOpenChange,
}: {
  applicationId: string
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [rejecting, setRejecting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: recruitmentKeys.applicationDetail(applicationId),
    queryFn: () => apiFetch<ApplicationDetail>(RECRUITMENT_ENDPOINTS.applicationItem(applicationId)),
  })

  // Seed the notes draft once the detail loads; keep local edits afterwards.
  // Render-phase adjust pattern (guarded) so it never loops.
  const [notesDraft, setNotesDraft] = useState<string | null>(null)
  if (data && notesDraft === null) {
    setNotesDraft(data.notes ?? "")
  }

  const mutationOpts = {
    onError: (err: Error) => {
      const mapped = recruitmentErrorMessage(err, t)
      toast.error(mapped ?? t("portal.recruitment.toasts.failed"))
    },
  }

  const stageMutation = useMutation({
    ...mutationOpts,
    mutationFn: (stage: string) =>
      apiFetch(RECRUITMENT_ENDPOINTS.applicationItem(applicationId), {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      }),
    onSuccess: (_d, stage) => {
      toast.success(
        stage === "rejected"
          ? t("portal.recruitment.toasts.applicationRejected")
          : t("portal.recruitment.toasts.stageAdvanced", { stage: stageLabel(stage, t) }),
      )
      setRejecting(false)
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })

  const ratingMutation = useMutation({
    ...mutationOpts,
    mutationFn: (rating: number) =>
      apiFetch(RECRUITMENT_ENDPOINTS.applicationItem(applicationId), {
        method: "PATCH",
        body: JSON.stringify({ rating }),
      }),
    onSuccess: () => {
      toast.success(t("portal.recruitment.toasts.ratingSaved"))
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })

  const notesMutation = useMutation({
    ...mutationOpts,
    mutationFn: (notes: string) =>
      apiFetch(RECRUITMENT_ENDPOINTS.applicationItem(applicationId), {
        method: "PATCH",
        body: JSON.stringify({ notes: notes.trim() || null }),
      }),
    onSuccess: () => {
      toast.success(t("portal.recruitment.toasts.notesSaved"))
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })

  const deleteMutation = useMutation({
    ...mutationOpts,
    mutationFn: () => apiFetch(RECRUITMENT_ENDPOINTS.applicationItem(applicationId), { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("portal.recruitment.toasts.applicationDeleted"))
      setDeleting(false)
      onOpenChange(false)
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })

  const nextStage = data ? NEXT_STAGE[data.stage] : null
  const terminal = data ? nextStage === null : false

  return (
    <Dialog open onOpenChange={(o) => !stageMutation.isPending && !deleteMutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto pf-scrollbar">
        <DialogHeader>
          <DialogTitle>{data?.candidateName ?? t("portal.recruitment.detail.title")}</DialogTitle>
          <DialogDescription>
            {data ? `${data.jobPosting.title} · ${stageLabel(data.stage, t)}` : " "}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : isError || !data ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm font-medium">{t("common.error")}</p>
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Profile badges + contact grid + cover note */}
            <ApplicationInfoGrid application={data} />

            {/* Rating */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t("portal.recruitment.detail.rating")}</p>
              <RatingEditor
                rating={data.rating}
                busy={ratingMutation.isPending}
                onChange={(value) => ratingMutation.mutate(value)}
              />
              <p className="text-xs text-muted-foreground">{t("portal.recruitment.detail.ratingHint")}</p>
            </div>

            <Separator />

            {/* Interview history + scheduling */}
            <InterviewSection applicationId={applicationId} />

            <Separator />

            {/* Internal notes */}
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("portal.recruitment.detail.notesLabel")}</p>
              <Textarea
                className="min-h-20 resize-y"
                placeholder={t("portal.recruitment.detail.notesPh")}
                value={notesDraft ?? ""}
                onChange={(e) => setNotesDraft(e.target.value)}
                aria-label={t("portal.recruitment.detail.notesLabel")}
              />
              <Button
                variant="outline"
                className="h-10"
                disabled={
                  notesMutation.isPending ||
                  notesDraft === null ||
                  (notesDraft.trim() || null) === (data.notes ?? null)
                }
                onClick={() => notesDraft !== null && notesMutation.mutate(notesDraft)}
              >
                {notesMutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {t("portal.recruitment.detail.saveNotes")}
              </Button>
            </div>

            {/* Stage actions */}
            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium">{t("portal.recruitment.detail.stageLabel")}</p>
              {terminal ? (
                <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  {t("portal.recruitment.detail.terminalNote")}
                </p>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {nextStage && (
                    <Button
                      className="h-10 flex-1"
                      disabled={stageMutation.isPending}
                      onClick={() => stageMutation.mutate(nextStage)}
                    >
                      <BadgeCheck className="size-4" aria-hidden />
                      {t("portal.recruitment.detail.advanceTo", { stage: stageLabel(nextStage, t) })}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-10 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={stageMutation.isPending}
                    onClick={() => setRejecting(true)}
                  >
                    <XCircle className="size-4" aria-hidden />
                    {t("portal.recruitment.applications.reject")}
                  </Button>
                </div>
              )}
              {data.stage === "applied" && (
                <Button
                  variant="ghost"
                  className="h-10 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {t("portal.recruitment.detail.delete")}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Reject confirm */}
      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={t("portal.recruitment.detail.rejectTitle")}
        description={t("portal.recruitment.detail.rejectDesc", { name: data?.candidateName ?? "" })}
        confirmLabel={t("portal.recruitment.detail.confirmReject")}
        cancelLabel={t("portal.common.cancel")}
        destructive
        onConfirm={() => stageMutation.mutate("rejected")}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("portal.recruitment.detail.deleteTitle")}
        description={t("portal.recruitment.detail.deleteDesc", { name: data?.candidateName ?? "" })}
        confirmLabel={t("portal.recruitment.detail.delete")}
        cancelLabel={t("portal.common.cancel")}
        destructive
        onConfirm={() => deleteMutation.mutate()}
      />
    </Dialog>
  )
}
