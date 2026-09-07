// Leave module UI helpers — type hues, status badges, Bengali date ranges,
// relative time, client-side working-day count (Task 4-b owned)
import type { Lang } from "@/lib/types"
import type { TranslateFn } from "@/lib/i18n"
import { formatDate, toBnDigits } from "@/lib/format"

// ─── Leave type hues (5 fixed — emerald / amber / teal / rose / violet) ───────

export interface LeaveHue {
  badge: string
  dot: string
  bar: string
}

const HUES: LeaveHue[] = [
  {
    badge:
      "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  {
    badge:
      "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  {
    badge:
      "border-teal-600/30 bg-teal-600/10 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300",
    dot: "bg-teal-500",
    bar: "bg-teal-500",
  },
  {
    badge:
      "border-rose-600/30 bg-rose-600/10 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
  {
    badge:
      "border-violet-600/30 bg-violet-600/10 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
  },
]

/** Hue for a leave type, by its position in the org's type list (stable, cycles). */
export function hueFor(index: number): LeaveHue {
  return HUES[index % HUES.length]
}

// ─── Status badges ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  pending: "border-warning/40 bg-warning/15 text-warning-foreground",
  approved: "border-success/30 bg-success/15 text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
}

export function leaveStatusBadgeClass(status: string): string {
  return STATUS_BADGE[status] ?? STATUS_BADGE.cancelled
}

export function leaveStatusLabel(status: string, t: TranslateFn): string {
  switch (status) {
    case "pending":
      return t("portal.leave.status.pending")
    case "approved":
      return t("portal.leave.status.approved")
    case "rejected":
      return t("portal.leave.status.rejected")
    case "cancelled":
      return t("portal.leave.status.cancelled")
    default:
      return status
  }
}

// ─── Bengali date formatting (day + full month, e.g. "১২ জানুয়ারি") ─────────

function parseLocalDate(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  const d = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const dayMonthFmt = new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long" })
const dayMonthFmtEn = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long" })

/** "১২ জানুয়ারি" / "12 January" */
export function formatLeaveDate(dateStr: string, lang: Lang): string {
  const d = parseLocalDate(dateStr)
  if (!d) return dateStr
  return lang === "bn" ? dayMonthFmt.format(d) : dayMonthFmtEn.format(d)
}

function yearOf(dateStr: string): string {
  return dateStr.slice(0, 4)
}

/**
 * Bengali date range: "১২ জানুয়ারি – ১৪ জানুয়ারি" (year appended only when
 * it differs from the current year, or the range crosses years).
 */
export function formatLeaveRange(fromDate: string, toDate: string, lang: Lang): string {
  const currentYear = String(new Date().getFullYear())
  const from = formatLeaveDate(fromDate, lang)
  if (fromDate === toDate) {
    const suffix = yearOf(fromDate) !== currentYear ? ` ${toBnDigitsOrEn(yearOf(fromDate), lang)}` : ""
    return `${from}${suffix}`
  }
  const to = formatLeaveDate(toDate, lang)
  if (yearOf(fromDate) !== yearOf(toDate)) {
    return `${from} ${toBnDigitsOrEn(yearOf(fromDate), lang)} – ${to} ${toBnDigitsOrEn(yearOf(toDate), lang)}`
  }
  const suffix = yearOf(fromDate) !== currentYear ? ` ${toBnDigitsOrEn(yearOf(fromDate), lang)}` : ""
  return `${from} – ${to}${suffix}`
}

function toBnDigitsOrEn(v: string, lang: Lang): string {
  return lang === "bn" ? toBnDigits(v) : v
}

// ─── Relative time ────────────────────────────────────────────────────────────

export function relativeLeaveTime(iso: string, lang: Lang, t: TranslateFn): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return formatDate(iso, lang)
  const diffMs = Date.now() - then.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return t("portal.leave.time.justNow")
  if (minutes < 60) return t("portal.leave.time.minAgo", { n: toBnNum(minutes, lang) })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t("portal.leave.time.hourAgo", { n: toBnNum(hours, lang) })
  const days = Math.floor(hours / 24)
  if (days <= 30) return t("portal.leave.time.dayAgo", { n: toBnNum(days, lang) })
  return formatDate(iso, lang)
}

function toBnNum(n: number, lang: Lang): string {
  return lang === "bn" ? toBnDigits(n) : String(n)
}

// ─── Client-side working days (Fri/Sat weekend, matches the org default) ─────

export function workingDaysClient(fromDate: string, toDate: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) return 0
  const start = new Date(`${fromDate}T00:00:00`)
  const end = new Date(`${toDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0
  let count = 0
  const cursor = new Date(start)
  let guard = 0
  while (cursor <= end && guard < 400) {
    const day = cursor.getDay()
    if (day !== 5 && day !== 6) count++
    cursor.setDate(cursor.getDate() + 1)
    guard++
  }
  return count
}

// ─── Balance progress tone (emerald → amber → rose at 60% / 85%) ─────────────

export function progressToneClass(ratio: number): string {
  if (ratio >= 0.85) return "bg-rose-500"
  if (ratio >= 0.6) return "bg-amber-500"
  return "bg-emerald-500"
}

export function progressRatio(used: number, allocated: number): number {
  if (allocated <= 0) return 0
  return Math.min(1, Math.max(0, used / allocated))
}

// ─── Map a server error code to a human message via i18n ─────────────────────

const KNOWN_CODES = new Set([
  "in_use",
  "name_taken",
  "overlap",
  "insufficient_balance",
  "weekend_only",
  "not_pending",
  "past_date",
  "invalid_range",
  "span_too_long",
  "invalid_employee",
  "invalid_leave_type",
  "not_found",
  "invalid_year",
])

/** Translate a leave API error code; returns null for unknown codes. */
export function leaveErrorMessage(err: unknown, t: TranslateFn): string | null {
  const code = err instanceof Error ? err.message : String(err)
  if (KNOWN_CODES.has(code)) return t(`portal.leave.errors.${code}`)
  return null
}
