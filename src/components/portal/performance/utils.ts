// Performance module UI helpers — status badges, criterion labels, score→color,
// unit-aware value formatting, goal date/progress helpers (Task 3-performance owned)
import type { Lang } from "@/lib/types"
import type { TranslateFn } from "@/lib/i18n"
import { formatBdt, formatNumber, toBnDigits } from "@/lib/format"

// ─── Goal status badges ───────────────────────────────────────────────────────

const GOAL_STATUS_BADGE: Record<string, string> = {
  active: "border-primary/30 bg-primary/10 text-primary",
  completed: "border-success/30 bg-success/15 text-success",
  cancelled: "border-border bg-muted text-muted-foreground",
}

export function goalStatusBadgeClass(status: string, isOverdue: boolean): string {
  if (isOverdue) return "border-destructive/30 bg-destructive/10 text-destructive"
  return GOAL_STATUS_BADGE[status] ?? GOAL_STATUS_BADGE.cancelled
}

export function goalStatusLabel(status: string, isOverdue: boolean, t: TranslateFn): string {
  if (isOverdue) return t("portal.performance.goalStatus.overdue")
  switch (status) {
    case "active":
      return t("portal.performance.goalStatus.active")
    case "completed":
      return t("portal.performance.goalStatus.completed")
    case "cancelled":
      return t("portal.performance.goalStatus.cancelled")
    default:
      return status
  }
}

// ─── Appraisal status badges ──────────────────────────────────────────────────

const APPRAISAL_STATUS_BADGE: Record<string, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  in_review: "border-warning/40 bg-warning/15 text-warning-foreground",
  final: "border-success/30 bg-success/15 text-success",
}

export function appraisalStatusBadgeClass(status: string): string {
  return APPRAISAL_STATUS_BADGE[status] ?? APPRAISAL_STATUS_BADGE.draft
}

export function appraisalStatusLabel(status: string, t: TranslateFn): string {
  switch (status) {
    case "draft":
      return t("portal.performance.appraisalStatus.draft")
    case "in_review":
      return t("portal.performance.appraisalStatus.in_review")
    case "final":
      return t("portal.performance.appraisalStatus.final")
    default:
      return status
  }
}

// ─── Criterion labels (bn/en via i18n) ────────────────────────────────────────

export function criterionLabel(criterion: string, t: TranslateFn): string {
  const key = `portal.performance.criteria.${criterion}`
  const label = t(key)
  return label === key ? criterion : label
}

// ─── Score → color (1-2 poor, 3 mixed, 4-5 good) ──────────────────────────────

export function scoreColorClass(score: number): string {
  if (score >= 4) return "text-success"
  if (score === 3) return "text-warning"
  return "text-destructive"
}

export function scoreStarsColor(score: number): string {
  if (score >= 4) return "fill-success text-success"
  if (score === 3) return "fill-warning text-warning"
  return "fill-destructive text-destructive"
}

/** Stars for a 0-5 score as a11y-friendly text (★★★★☆). */
export function scoreStarsText(score: number): string {
  const rounded = Math.round(score)
  return "★".repeat(Math.max(0, Math.min(5, rounded))) + "☆".repeat(Math.max(0, 5 - rounded))
}

// ─── Unit-aware value formatting ──────────────────────────────────────────────

export function formatGoalValue(value: number, unit: string, lang: Lang): string {
  if (unit === "টাকা") return formatBdt(Math.round(value), lang)
  if (unit === "%") return `${lang === "bn" ? toBnDigits(Math.round(value)) : Math.round(value)}%`
  return formatNumber(Math.round(value), lang)
}

// ─── Progress + due-date helpers ──────────────────────────────────────────────

export function progressColorClass(percent: number): string {
  if (percent >= 100) return "bg-success"
  if (percent >= 60) return "bg-primary"
  return "bg-amber-500"
}

const dayMonthFmt = new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", year: "numeric" })
const dayMonthFmtEn = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" })

/** "১২ জানু ২০২৬" style local date from a YYYY-MM-DD string. */
export function formatGoalDate(dateStr: string, lang: Lang): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return lang === "bn" ? dayMonthFmt.format(d) : dayMonthFmtEn.format(d)
}

/** Days-left pill text: আজ মেয়াদ / {n} দিন বাকি / {n} দিন পার. */
export function dueText(daysRemaining: number, lang: Lang, t: TranslateFn): string {
  const n = formatNumber(Math.abs(daysRemaining), lang)
  if (daysRemaining === 0) return t("portal.performance.goals.dueToday")
  if (daysRemaining > 0) return t("portal.performance.goals.daysLeft", { n })
  return t("portal.performance.goals.daysOver", { n })
}

export function dueTextClass(daysRemaining: number, isOverdue: boolean): string {
  if (isOverdue) return "text-destructive font-medium"
  if (daysRemaining <= 7) return "text-warning-foreground font-medium"
  return "text-muted-foreground"
}

// ─── Map a server error code to a human message via i18n ─────────────────────

const KNOWN_CODES = new Set([
  "invalid_employee",
  "invalid_title",
  "invalid_description",
  "invalid_unit",
  "invalid_target",
  "invalid_current",
  "invalid_range",
  "invalid_weight",
  "invalid_status",
  "invalid_period",
  "invalid_criterion",
  "invalid_score",
  "invalid_comment",
  "invalid_items",
  "invalid_note",
  "duplicate_criterion",
  "not_active",
  "not_found",
  "locked",
  "invalid_transition",
  "period_taken",
  "create_failed",
  "update_failed",
  "delete_failed",
  "list_failed",
  "empty_patch",
])

/** Translate a performance API error code; returns null for unknown codes. */
export function performanceErrorMessage(err: unknown, t: TranslateFn): string | null {
  const code = err instanceof Error ? err.message : String(err)
  if (KNOWN_CODES.has(code)) return t(`portal.performance.errors.${code}`)
  return null
}
