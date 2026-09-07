"use client"

// Interview section (inside the application detail dialog) — round history with
// per-interview feedback/result recording + schedule form for the next round.
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CalendarClock, CheckCircle2, MapPin, Phone, User, Video } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  RECRUITMENT_ENDPOINTS,
  recruitmentKeys,
  type InterviewRow,
  type InterviewsData,
} from "./types"
import {
  interviewModeLabel,
  interviewResultClass,
  interviewResultLabel,
  isUpcomingInterview,
  recruitmentErrorMessage,
} from "./utils"
import { ScheduleInterviewForm } from "./schedule-interview-form"

const MODE_ICON: Record<string, typeof MapPin> = {
  onsite: MapPin,
  phone: Phone,
  video: Video,
}

const RESULT_OPTIONS = ["pass", "fail"] as const

function InterviewItem({
  interview,
  onSaved,
}: {
  interview: InterviewRow
  onSaved: () => void
}) {
  const { lang, t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [feedback, setFeedback] = useState(interview.feedback ?? "")
  const [result, setResult] = useState<string>(interview.result)

  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(RECRUITMENT_ENDPOINTS.interviewItem(interview.applicationId, interview.id), {
        method: "PATCH",
        body: JSON.stringify({ feedback: feedback.trim() || null, result }),
      }),
    onSuccess: () => {
      toast.success(t("portal.recruitment.toasts.interviewUpdated"))
      setEditing(false)
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.all })
      onSaved()
    },
    onError: (err: Error) => {
      const mapped = recruitmentErrorMessage(err, t)
      toast.error(mapped ?? t("portal.recruitment.toasts.failed"))
    },
  })

  const ModeIcon = MODE_ICON[interview.mode] ?? MapPin
  const upcoming = isUpcomingInterview(interview.scheduledAt, interview.result)

  return (
    <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-sm font-semibold">
          {t("portal.recruitment.interviews.round", { n: interview.round })}
        </p>
        <Badge variant="outline" className="font-medium">
          <ModeIcon className="mr-1 size-3" aria-hidden />
          {interviewModeLabel(interview.mode, t)}
        </Badge>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          <CalendarClock className="size-3.5" aria-hidden />
          {formatDateTime(interview.scheduledAt, lang)}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "ml-auto",
            upcoming ? "border-warning/40 bg-warning/15 text-warning-foreground" : interviewResultClass(interview.result),
          )}
        >
          {upcoming ? t("portal.recruitment.interviews.upcoming") : interviewResultLabel(interview.result, t)}
        </Badge>
      </div>

      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <User className="size-3.5 shrink-0" aria-hidden />
        {t("portal.recruitment.interviews.interviewer")}:{" "}
        <span className="font-medium text-foreground">
          {interview.interviewer ?? t("portal.recruitment.interviews.noInterviewer")}
        </span>
      </p>

      {interview.feedback && !editing && (
        <p className="mt-2 whitespace-pre-line rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("portal.recruitment.interviews.feedback")}:{" "}
          </span>
          {interview.feedback}
        </p>
      )}

      {!upcoming && !editing && (
        <Button
          variant="outline"
          className="mt-2 h-9 w-full text-xs sm:w-auto"
          onClick={() => {
            setFeedback(interview.feedback ?? "")
            setResult(interview.result)
            setEditing(true)
          }}
        >
          {t("portal.recruitment.interviews.recordFeedback")}
        </Button>
      )}

      {editing && (
        <div className="mt-3 space-y-2">
          <Textarea
            className="min-h-20 resize-y text-sm"
            placeholder={t("portal.recruitment.interviews.feedbackPh")}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            aria-label={t("portal.recruitment.interviews.feedback")}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={result} onValueChange={setResult}>
              <SelectTrigger className="h-9 w-full text-sm sm:w-40" aria-label={t("portal.recruitment.interviews.resultLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["pending", ...RESULT_OPTIONS].map((r) => (
                  <SelectItem key={r} value={r} className="min-h-9">
                    {interviewResultLabel(r, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 sm:ml-auto">
              <Button
                variant="outline"
                className="h-9"
                disabled={mutation.isPending}
                onClick={() => setEditing(false)}
              >
                {t("portal.common.cancel")}
              </Button>
              <Button className="h-9" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                <CheckCircle2 className="size-4" aria-hidden />
                {t("portal.recruitment.interviews.submitFeedback")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function InterviewSection({ applicationId }: { applicationId: string }) {
  const { t } = useI18n()
  const [version, setVersion] = useState(0)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [...recruitmentKeys.applicationDetail(applicationId), "interviews", version],
    queryFn: () => apiFetch<InterviewsData>(RECRUITMENT_ENDPOINTS.interviews(applicationId)),
  })

  const interviews = data?.items ?? []
  const nextRound = interviews.length > 0 ? Math.max(...interviews.map((i) => i.round)) + 1 : 1

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t("portal.recruitment.interviews.sectionTitle")}</p>

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 px-3 py-2">
          <p className="text-xs text-muted-foreground">{t("common.error")}</p>
          <Button variant="outline" className="h-9" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : interviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-xs text-muted-foreground">
          {t("portal.recruitment.interviews.none")}
        </p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pf-scrollbar pr-1">
          {interviews.map((iv) => (
            <InterviewItem key={iv.id} interview={iv} onSaved={() => setVersion((v) => v + 1)} />
          ))}
        </div>
      )}

      <ScheduleInterviewForm
        applicationId={applicationId}
        nextRound={Math.min(10, nextRound)}
        onScheduled={() => setVersion((v) => v + 1)}
      />
    </div>
  )
}
