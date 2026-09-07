"use client"

// Candidate application card — identity, job title, stage badge, rating stars,
// expected salary, phone, relative time + advance / reject / details actions.
import { BadgeCheck, ChevronRight, Star, XCircle } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { NEXT_STAGE, type JobApplicationRow } from "./types"
import {
  formatBdPhone,
  relativeRecruitmentTime,
  stageBadgeClass,
  stageLabel,
} from "./utils"

/** Read-only 0–5 star row (empty stars dimmed). */
export function RatingStars({
  rating,
  className,
  label,
}: {
  rating: number
  className?: string
  label: string
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${label}: ${rating}/5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i <= rating
              ? "fill-amber-500 text-amber-500"
              : "fill-muted-foreground/15 text-muted-foreground/30",
          )}
          aria-hidden
        />
      ))}
    </span>
  )
}

export function ApplicationCard({
  application,
  busy,
  onAdvance,
  onReject,
  onOpen,
}: {
  application: JobApplicationRow
  busy: boolean
  onAdvance: () => void
  onReject: () => void
  onOpen: () => void
}) {
  const { lang, t } = useI18n()
  const nextStage = NEXT_STAGE[application.stage]
  const isTerminal = nextStage === null
  const phone = formatBdPhone(application.candidatePhone, lang)

  return (
    <Card
      className={cn(
        "pf-card-hover border-border/80 bg-card shadow-xs",
        application.stage === "applied" && "border-primary/25",
      )}
    >
      <CardContent className="space-y-3 p-4 sm:p-5">
        {/* Identity row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
                {initialsOf(application.candidateName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{application.candidateName}</p>
              <p className="truncate text-xs text-muted-foreground">{application.jobPosting.title}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("shrink-0 whitespace-nowrap", stageBadgeClass(application.stage))}>
            {stageLabel(application.stage, t)}
          </Badge>
        </div>

        {/* Facts row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          {application.expectedSalary !== null && (
            <span className="font-medium text-foreground pf-money">
              {formatBdt(application.expectedSalary, lang)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                /{t("portal.common.monthUnit")}
              </span>
            </span>
          )}
          {phone && <span className="tabular-nums">{phone}</span>}
          {application.rating > 0 && (
            <RatingStars rating={application.rating} label={t("portal.recruitment.detail.rating")} />
          )}
        </div>

        {/* Meta row */}
        <p className="text-xs text-muted-foreground">
          {t("portal.recruitment.detail.appliedOn")} {relativeRecruitmentTime(application.createdAt, lang, t)}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="outline" className="h-10 flex-1 sm:flex-none" disabled={busy} onClick={onOpen}>
            {t("portal.recruitment.applications.details")}
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          {!isTerminal && (
            <>
              {nextStage && (
                <Button className="h-10 flex-1 sm:min-w-32" disabled={busy} onClick={onAdvance}>
                  <BadgeCheck className="size-4" aria-hidden />
                  {t("portal.recruitment.applications.advance")} · {stageLabel(nextStage, t)}
                </Button>
              )}
              <Button
                variant="outline"
                className="h-10 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-w-32"
                disabled={busy}
                onClick={onReject}
              >
                <XCircle className="size-4" aria-hidden />
                {t("portal.recruitment.applications.reject")}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
