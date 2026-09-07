// Attendance module — status colors/labels, relative time, date labels (bilingual)
import type { Lang } from "@/lib/types"
import type { TranslateFn } from "@/lib/i18n"
import { formatNumber, toBnDigits } from "@/lib/format"

/** Badge classes per attendance status (present=emerald, late=amber, absent=red, on_leave=teal). */
export const STATUS_BADGE: Record<string, string> = {
  present: "border-success/30 bg-success/15 text-success",
  late: "border-warning/45 bg-warning/15 text-warning-foreground",
  absent: "border-destructive/30 bg-destructive/10 text-destructive",
  on_leave: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  half_day: "border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  no_record: "border-border bg-muted/50 text-muted-foreground",
}

/** Dot classes for the month matrix / strips. */
export const STATUS_DOT: Record<string, string> = {
  present: "bg-success",
  late: "bg-warning",
  absent: "bg-destructive",
  on_leave: "bg-teal-500",
  half_day: "bg-orange-500",
  no_record: "bg-muted-foreground/15",
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  present: "portal.attendance.statuses.present",
  late: "portal.attendance.statuses.late",
  absent: "portal.attendance.statuses.absent",
  on_leave: "portal.attendance.statuses.onLeave",
  half_day: "portal.attendance.statuses.halfDay",
}

export function attendanceStatusKey(status: string | null): string {
  return status && status in STATUS_LABEL_KEYS ? status : "no_record"
}

export function attendanceStatusLabel(status: string | null, t: TranslateFn): string {
  if (!status || !(status in STATUS_LABEL_KEYS)) return t("portal.attendance.statuses.noRecord")
  return t(STATUS_LABEL_KEYS[status] as string)
}

export function statusBadgeClass(status: string | null): string {
  return STATUS_BADGE[attendanceStatusKey(status)]
}

export function statusDotClass(status: string | null): string {
  return STATUS_DOT[attendanceStatusKey(status)]
}

/** Bengali-first relative time: "২ ঘণ্টা আগে" / "2 hr ago". */
export function formatRelativeTime(iso: string | null, lang: Lang, t: TranslateFn): string {
  if (!iso) return t("portal.attendance.devices.neverSynced")
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return t("portal.attendance.rel.justNow")
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return t("portal.attendance.rel.minAgo", { n: formatNumber(mins, lang) })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t("portal.attendance.rel.hourAgo", { n: formatNumber(hours, lang) })
  const days = Math.floor(hours / 24)
  return t("portal.attendance.rel.dayAgo", { n: formatNumber(days, lang) })
}

/** "8.2 ঘণ্টা" / "8.2 hrs" — 1 decimal, Bengali digits in bn. Empty dash for null/0-min. */
export function formatWorkedHours(minutes: number | null, lang: Lang): string {
  if (minutes === null || minutes === 0) return "—"
  const hours = Math.round((minutes / 60) * 10) / 10
  const num = lang === "bn" ? toBnDigits(hours) : String(hours)
  return `${num} ${lang === "bn" ? "ঘণ্টা" : "hrs"}`
}

/** Full localized date: "সোমবার, ৭ সেপ্টেম্বর ২০২৬". */
export function attendanceDateLabel(date: string, lang: Lang): string {
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}

/** Localized month label: "সেপ্টেম্বর ২০২৬". */
export function attendanceMonthLabel(month: string, lang: Lang): string {
  const d = new Date(`${month}-01T00:00:00`)
  if (Number.isNaN(d.getTime())) return month
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(d)
}

/** Short weekday label (row header hints / legend). */
const DAY_KEYS = [
  "portal.attendance.month.dayNames.sun",
  "portal.attendance.month.dayNames.mon",
  "portal.attendance.month.dayNames.tue",
  "portal.attendance.month.dayNames.wed",
  "portal.attendance.month.dayNames.thu",
  "portal.attendance.month.dayNames.fri",
  "portal.attendance.month.dayNames.sat",
]

export function dayOfWeekLabel(dow: number, t: TranslateFn): string {
  return t(DAY_KEYS[dow] ?? DAY_KEYS[0])
}
