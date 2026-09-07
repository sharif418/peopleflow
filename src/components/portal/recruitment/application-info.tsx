"use client"

// Candidate profile blocks for the detail dialog — badges + contact grid +
// cover note + the interactive 0–5 rating editor.
import { Mail, Phone, Star, StarIcon } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { ApplicationDetail } from "./types"
import { employmentTypeLabel, formatBdPhone, stageBadgeClass, stageLabel } from "./utils"

/** Interactive 0–5 rating editor (tap a star; tap the filled one to clear). */
export function RatingEditor({
  rating,
  busy,
  onChange,
}: {
  rating: number
  busy: boolean
  onChange: (value: number) => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={t("portal.recruitment.detail.rating")}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={rating === i}
          aria-label={`${i}`}
          disabled={busy}
          onClick={() => onChange(i === rating ? 0 : i)}
          className="rounded-full p-1.5 transition-transform hover:scale-110 disabled:opacity-50"
        >
          <Star
            className={cn(
              "size-5",
              i <= rating ? "fill-amber-500 text-amber-500" : "fill-muted-foreground/10 text-muted-foreground/40",
            )}
            aria-hidden
          />
        </button>
      ))}
      <span className="ml-2 inline-flex items-center gap-1 text-sm font-medium tabular-nums">
        <StarIcon className="size-3 fill-amber-500 text-amber-500" aria-hidden />
        {rating}/5
      </span>
    </div>
  )
}

/** Stage/type/department badges + contact grid + expected salary + cover note. */
export function ApplicationInfoGrid({ application }: { application: ApplicationDetail }) {
  const { lang, t } = useI18n()
  const phone = formatBdPhone(application.candidatePhone, lang)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={stageBadgeClass(application.stage)}>
          {stageLabel(application.stage, t)}
        </Badge>
        <Badge variant="outline" className="font-medium">
          {employmentTypeLabel(application.jobPosting.employmentType, t)}
        </Badge>
        {application.jobPosting.department && (
          <Badge variant="secondary">{application.jobPosting.department.name}</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/80 bg-muted/30 p-3 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Mail className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{application.candidateEmail ?? t("portal.common.notSet")}</span>
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Phone className="size-4 shrink-0" aria-hidden />
          <span className="tabular-nums">{phone ?? t("portal.common.notSet")}</span>
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("portal.recruitment.detail.expectedSalary")}:{" "}
          </span>
          <span className="pf-money">
            {application.expectedSalary !== null
              ? formatBdt(application.expectedSalary, lang)
              : t("portal.common.notSet")}
          </span>
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("portal.recruitment.detail.appliedOn")}:{" "}
          </span>
          {formatDate(application.createdAt, lang)}
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("portal.recruitment.detail.coverNote")}</p>
        {application.coverNote ? (
          <p className="whitespace-pre-line rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
            {application.coverNote}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            {t("portal.recruitment.detail.noCoverNote")}
          </p>
        )}
      </div>
    </div>
  )
}
