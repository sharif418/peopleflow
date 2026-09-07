// Formatting helpers — Bengali numerals, BDT currency, dates
import type { Lang } from "@/lib/types"

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"]

export function toBnDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)])
}

export function formatNumber(n: number, lang: Lang): string {
  const base = n.toLocaleString("en-US")
  return lang === "bn" ? toBnDigits(base) : base
}

export function formatBdt(n: number, lang: Lang): string {
  return `৳${formatNumber(n, lang)}`
}

export function formatPercent(n: number, lang: Lang): string {
  return `${lang === "bn" ? toBnDigits(n) : n}%`
}

export function formatDate(date: string | Date, lang: Lang): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return String(date)
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

export function formatDateTime(date: string | Date, lang: Lang): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return String(date)
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.charAt(0) ?? "?"
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
  return (first + second).toUpperCase()
}
