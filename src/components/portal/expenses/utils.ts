// Expense module UI helpers — category meta (bn/en labels, icons, badges),
// status badges, Bengali dates, relative time, error mapping (Task 3-expenses)
import type { LucideIcon } from "lucide-react"
import { Bus, Coffee, GraduationCap, Paperclip, Tag, UtensilsCrossed, Zap } from "lucide-react"
import type { Lang } from "@/lib/types"
import type { TranslateFn } from "@/lib/i18n"
import { formatDate, toBnDigits } from "@/lib/format"
import type { ExpenseCategory, ClaimStatus } from "./types"

// ─── Category meta (icons + badge tones; no indigo/blue) ─────────────────────

export interface CategoryMeta {
  icon: LucideIcon
  badge: string
  iconClass: string
}

const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  travel: {
    icon: Bus,
    badge:
      "border-teal-600/30 bg-teal-600/10 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300",
    iconClass: "bg-teal-600/10 text-teal-700 dark:text-teal-300",
  },
  food: {
    icon: UtensilsCrossed,
    badge:
      "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
    iconClass: "bg-amber-600/10 text-amber-700 dark:text-amber-300",
  },
  office_supplies: {
    icon: Paperclip,
    badge:
      "border-violet-600/30 bg-violet-600/10 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300",
    iconClass: "bg-violet-600/10 text-violet-700 dark:text-violet-300",
  },
  client_entertainment: {
    icon: Coffee,
    badge:
      "border-rose-600/30 bg-rose-600/10 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300",
    iconClass: "bg-rose-600/10 text-rose-700 dark:text-rose-300",
  },
  utilities: {
    icon: Zap,
    badge:
      "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
    iconClass: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  },
  training: {
    icon: GraduationCap,
    badge:
      "border-orange-600/30 bg-orange-600/10 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-300",
    iconClass: "bg-orange-600/10 text-orange-700 dark:text-orange-300",
  },
  other: {
    icon: Tag,
    badge: "border-border bg-muted text-muted-foreground",
    iconClass: "bg-muted text-muted-foreground",
  },
}

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category as ExpenseCategory] ?? CATEGORY_META.other
}

export function categoryLabel(category: string, t: TranslateFn): string {
  const known = Object.prototype.hasOwnProperty.call(BN_CATEGORY_LABELS, category)
  return known ? t(`portal.expense.category.${category}`) : t("portal.expense.category.other")
}

const BN_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  travel: "ভ্রমণ",
  food: "খাবার",
  office_supplies: "অফিস সামগ্রী",
  client_entertainment: "ক্লায়েন্ট খাওয়া-দাওয়া",
  utilities: "ইউটিলিটি",
  training: "প্রশিক্ষণ",
  other: "অন্যান্য",
}

// ─── Status badges ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ClaimStatus, string> = {
  submitted: "border-warning/40 bg-warning/15 text-warning-foreground",
  approved: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  paid: "border-teal-600/30 bg-teal-600/10 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300",
}

export function claimStatusBadgeClass(status: string): string {
  return STATUS_BADGE[status as ClaimStatus] ?? STATUS_BADGE.submitted
}

export function claimStatusLabel(status: string, t: TranslateFn): string {
  switch (status) {
    case "submitted":
      return t("portal.expense.status.submitted")
    case "approved":
      return t("portal.expense.status.approved")
    case "rejected":
      return t("portal.expense.status.rejected")
    case "paid":
      return t("portal.expense.status.paid")
    default:
      return status
  }
}

// ─── Bengali expense date ("১২ জানুয়ারি", year appended when not current) ──

const dayMonthFmtBn = new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long" })
const dayMonthFmtEn = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long" })

export function formatExpenseDate(dateStr: string, lang: Lang): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  const base = lang === "bn" ? dayMonthFmtBn.format(d) : dayMonthFmtEn.format(d)
  const year = dateStr.slice(0, 4)
  if (year === String(new Date().getFullYear())) return base
  return `${base} ${lang === "bn" ? toBnDigits(year) : year}`
}

// ─── Relative time ────────────────────────────────────────────────────────────

export function relativeExpenseTime(iso: string, lang: Lang, t: TranslateFn): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return formatDate(iso, lang)
  const minutes = Math.floor((Date.now() - then.getTime()) / 60_000)
  if (minutes < 1) return t("portal.expense.time.justNow")
  if (minutes < 60) return t("portal.expense.time.minAgo", { n: toBnNum(minutes, lang) })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t("portal.expense.time.hourAgo", { n: toBnNum(hours, lang) })
  const days = Math.floor(hours / 24)
  if (days <= 30) return t("portal.expense.time.dayAgo", { n: toBnNum(days, lang) })
  return formatDate(iso, lang)
}

function toBnNum(n: number, lang: Lang): string {
  return lang === "bn" ? toBnDigits(n) : String(n)
}

// ─── Map a server error code to a human message via i18n ─────────────────────

const KNOWN_CODES = new Set([
  "invalid_employee",
  "invalid_category",
  "invalid_title",
  "invalid_date",
  "invalid_amount",
  "invalid_label",
  "no_items",
  "too_many_items",
  "note_required",
  "not_submitted",
  "not_approved",
  "not_found",
])

/** Translate an expense API error code; returns null for unknown codes. */
export function expenseErrorMessage(err: unknown, t: TranslateFn): string | null {
  const code = err instanceof Error ? err.message : String(err)
  if (KNOWN_CODES.has(code)) return t(`portal.expense.errors.${code}`)
  return null
}
