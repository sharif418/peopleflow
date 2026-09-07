// Recruitment module UI helpers — stage/status badges, employment-type labels,
// BD phone formatting, relative time, error-code mapping (Task 3-recruitment owned)
import type { Lang } from "@/lib/types"
import type { TranslateFn } from "@/lib/i18n"
import { formatDate, toBnDigits } from "@/lib/format"

// ─── Stage badges (muted → amber → violet → teal → emerald → rose) ───────────

const STAGE_BADGE: Record<string, string> = {
  applied: "border-border bg-muted text-muted-foreground",
  screening: "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
  interview: "border-violet-600/30 bg-violet-600/10 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300",
  offer: "border-teal-600/30 bg-teal-600/10 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300",
  hired: "border-success/30 bg-success/15 text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
}

export function stageBadgeClass(stage: string): string {
  return STAGE_BADGE[stage] ?? STAGE_BADGE.applied
}

export function stageLabel(stage: string, t: TranslateFn): string {
  return t(`portal.recruitment.stage.${stage}`)
}

export function stageShortLabel(stage: string, t: TranslateFn): string {
  return t(`portal.recruitment.stageShort.${stage}`)
}

// ─── Job status badges ────────────────────────────────────────────────────────

const JOB_STATUS_BADGE: Record<string, string> = {
  open: "border-success/30 bg-success/15 text-success",
  on_hold: "border-warning/40 bg-warning/15 text-warning-foreground",
  closed: "border-border bg-muted text-muted-foreground",
}

export function jobStatusBadgeClass(status: string): string {
  return JOB_STATUS_BADGE[status] ?? JOB_STATUS_BADGE.closed
}

export function jobStatusLabel(status: string, t: TranslateFn): string {
  return t(`portal.recruitment.jobStatus.${status}`)
}

export function employmentTypeLabel(type: string, t: TranslateFn): string {
  return t(`portal.recruitment.employmentType.${type}`)
}

// ─── Interview helpers ────────────────────────────────────────────────────────

const RESULT_BADGE: Record<string, string> = {
  pending: "border-warning/40 bg-warning/15 text-warning-foreground",
  pass: "border-success/30 bg-success/15 text-success",
  fail: "border-destructive/30 bg-destructive/10 text-destructive",
}

export function interviewResultClass(result: string): string {
  return RESULT_BADGE[result] ?? RESULT_BADGE.pending
}

export function interviewResultLabel(result: string, t: TranslateFn): string {
  return t(`portal.recruitment.interviews.result.${result}`)
}

export function interviewModeLabel(mode: string, t: TranslateFn): string {
  return t(`portal.recruitment.interviews.mode.${mode}`)
}

export function isUpcomingInterview(scheduledAt: string, result: string): boolean {
  return result === "pending" && new Date(scheduledAt).getTime() > Date.now()
}

// ─── BD phone formatting ──────────────────────────────────────────────────────

/**
 * Format a BD mobile number for display: "01712345678" → "০১৭১২-৩৪৫৬৭৮".
 * Handles +880 / 880 prefixes; returns the raw value when unrecognized.
 */
export function formatBdPhone(raw: string | null, lang: Lang): string | null {
  if (!raw) return null
  const digits = raw.replace(/[\s-]/g, "")
  let local = digits
  if (local.startsWith("+880")) local = `0${local.slice(4)}`
  else if (local.startsWith("880")) local = `0${local.slice(3)}`
  if (/^01[3-9]\d{8}$/.test(local)) {
    const pretty = `${local.slice(0, 5)}-${local.slice(5)}`
    return lang === "bn" ? toBnDigits(pretty) : pretty
  }
  return lang === "bn" ? toBnDigits(digits) : digits
}

// ─── Deadline helpers ─────────────────────────────────────────────────────────

/** Days until an ISO datetime deadline (end-of-day semantics); negative = passed. */
export function daysUntilDeadline(closesAt: string | null): number | null {
  if (!closesAt) return null
  const end = new Date(`${closesAt.slice(0, 10)}T23:59:59`)
  if (Number.isNaN(end.getTime())) return null
  const today = new Date()
  const diff = end.getTime() - today.getTime()
  return Math.round(diff / 86_400_000)
}

// ─── Relative time ────────────────────────────────────────────────────────────

export function relativeRecruitmentTime(iso: string, lang: Lang, t: TranslateFn): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return formatDate(iso, lang)
  const diffMs = Date.now() - then.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return t("portal.recruitment.time.justNow")
  if (minutes < 60) return t("portal.recruitment.time.minAgo", { n: toBnNum(minutes, lang) })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t("portal.recruitment.time.hourAgo", { n: toBnNum(hours, lang) })
  const days = Math.floor(hours / 24)
  if (days <= 30) return t("portal.recruitment.time.dayAgo", { n: toBnNum(days, lang) })
  return formatDate(iso, lang)
}

function toBnNum(n: number, lang: Lang): string {
  return lang === "bn" ? toBnDigits(n) : String(n)
}

// ─── Map a server error code to a human message via i18n ─────────────────────

const KNOWN_CODES = new Set([
  "not_found",
  "invalid_job",
  "job_closed",
  "in_use",
  "round_taken",
  "invalid_stage",
  "terminal_stage",
  "not_in_applied",
  "invalid_relation_department",
  "invalid_relation_designation",
  "past_closes_at",
  "past_datetime",
  "invalid_datetime",
])

/** Translate a recruitment API error code; returns null for unknown codes. */
export function recruitmentErrorMessage(err: unknown, t: TranslateFn): string | null {
  const code = err instanceof Error ? err.message : String(err)
  if (KNOWN_CODES.has(code)) return t(`portal.recruitment.errors.${code}`)
  return null
}
