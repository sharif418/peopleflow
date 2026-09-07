// Payroll label helpers + badge styling + period formatting (bilingual)
import type { Lang } from "@/lib/types"
import type { TranslateFn } from "@/lib/i18n"
import { formatBdt, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { StructureComponent } from "./types"

const SLIP_STATUS_BADGE: Record<string, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  confirmed: "border-primary/30 bg-primary/12 text-primary",
  paid: "border-success/30 bg-success/15 text-success",
}

export function payslipStatusBadgeClass(status: string): string {
  return SLIP_STATUS_BADGE[status] ?? SLIP_STATUS_BADGE.draft
}

export function payslipStatusLabel(status: string, t: TranslateFn): string {
  switch (status) {
    case "draft":
      return t("portal.payroll.statusDraft")
    case "confirmed":
      return t("portal.payroll.statusConfirmed")
    case "paid":
      return t("portal.payroll.statusPaid")
    default:
      return status
  }
}

/** "2026-09" → "সেপ্টেম্বর ২০২৬" / "September 2026" */
export function formatPeriod(period: string, lang: Lang): string {
  const d = new Date(`${period}-01T00:00:00`)
  if (Number.isNaN(d.getTime())) return period
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(d)
}

/** Component value display: percent → "৫০%", fixed → "৳৫,০০০". */
export function componentValueLabel(c: Pick<StructureComponent, "calcType" | "value">, lang: Lang): string {
  return c.calcType === "percent" ? formatPercent(c.value, lang) : formatBdt(c.value, lang)
}

export const EARNING_BADGE = "border-primary/25 bg-primary/10 text-primary"
export const DEDUCTION_BADGE = "border-destructive/30 bg-destructive/10 text-destructive"
