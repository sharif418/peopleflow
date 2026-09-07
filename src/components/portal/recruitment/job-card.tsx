"use client"

// Job posting card — title, dept/type badges, vacancies, status, deadline,
// application count and row actions (edit / status / see applications / delete).
import { Archive, Briefcase, CalendarClock, Clock, Pencil, Trash2, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { JobPostingRow } from "./types"
import {
  daysUntilDeadline,
  employmentTypeLabel,
  jobStatusBadgeClass,
  jobStatusLabel,
} from "./utils"

export function JobCard({
  job,
  busy,
  onEdit,
  onDelete,
  onStatus,
  onSeeApplications,
}: {
  job: JobPostingRow
  busy: boolean
  onEdit: () => void
  onDelete: () => void
  onStatus: (status: "open" | "on_hold" | "closed") => void
  onSeeApplications: () => void
}) {
  const { lang, t } = useI18n()
  const daysLeft = daysUntilDeadline(job.closesAt)
  const applications = job._count.applications

  return (
    <Card
      className={cn(
        "pf-card-hover border-border/80 bg-card shadow-xs",
        job.status === "open" && "border-success/25",
      )}
    >
      <CardContent className="space-y-3 p-4 sm:p-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Briefcase className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">{job.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="truncate">{job.department?.name ?? t("portal.recruitment.jobs.noDept")}</span>
                {job.designation && <span className="text-border">·</span>}
                {job.designation && <span className="truncate">{job.designation.name}</span>}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("shrink-0 whitespace-nowrap", jobStatusBadgeClass(job.status))}>
            {jobStatusLabel(job.status, t)}
          </Badge>
        </div>

        {/* Facts row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="tabular-nums">
            {t("portal.recruitment.jobs.vacancies", { n: formatNumber(job.vacancies, lang) })}
          </Badge>
          <Badge variant="outline" className="whitespace-nowrap font-medium">
            {employmentTypeLabel(job.employmentType, t)}
          </Badge>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4 shrink-0" aria-hidden />
            <span className="tabular-nums">
              {t("portal.recruitment.jobs.applicationCount", { n: formatNumber(applications, lang) })}
            </span>
          </span>
        </div>

        {/* Deadline */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {t("portal.recruitment.jobs.postedOn")} {new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-US", {
              day: "numeric",
              month: "short",
            }).format(new Date(job.postedAt))}
          </span>
          <span className="text-border">·</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5",
              daysLeft !== null && daysLeft < 0 && "text-destructive",
              daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && "text-warning-foreground",
            )}
          >
            <CalendarClock className="size-3.5" aria-hidden />
            {daysLeft === null ? (
              t("portal.recruitment.jobs.noDeadline")
            ) : daysLeft < 0 ? (
              t("portal.recruitment.jobs.deadlinePassed")
            ) : (
              <>
                {t("portal.recruitment.jobs.closesOn")}{" "}
                {new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-US", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(job.closesAt!))}
                <span className="font-medium">
                  ({t("portal.recruitment.jobs.closesInDays", { n: formatNumber(daysLeft, lang) })})
                </span>
              </>
            )}
          </span>
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="outline"
            className="h-10 flex-1 sm:flex-none"
            disabled={busy || applications === 0}
            onClick={onSeeApplications}
          >
            <Users className="size-4" aria-hidden />
            {t("portal.recruitment.jobs.viewApplications")}
            {applications > 0 && (
              <Badge className="ml-1 h-5 px-1.5 tabular-nums">{formatNumber(applications, lang)}</Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            aria-label={t("portal.recruitment.jobs.edit")}
            disabled={busy}
            onClick={onEdit}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          {job.status !== "closed" ? (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              aria-label={t("portal.recruitment.jobs.closeJob")}
              disabled={busy}
              onClick={() => onStatus("closed")}
            >
              <Archive className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 text-success hover:bg-success/10 hover:text-success"
              aria-label={t("portal.recruitment.jobs.reopenJob")}
              disabled={busy}
              onClick={() => onStatus("open")}
            >
              <Clock className="size-4" aria-hidden />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={t("portal.recruitment.jobs.delete")}
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
