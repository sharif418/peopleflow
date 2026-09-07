// Shared label helpers + badge styling for employee enums (bilingual)
import type { TranslateFn } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const STATUS_BADGE: Record<string, string> = {
  active: "border-success/30 bg-success/15 text-success",
  probation: "border-warning/40 bg-warning/15 text-warning-foreground",
  suspended: "border-destructive/30 bg-destructive/10 text-destructive",
  inactive: "border-border bg-muted text-muted-foreground",
}

export function statusBadgeClass(status: string): string {
  return STATUS_BADGE[status] ?? STATUS_BADGE.inactive
}

export function statusLabel(status: string, t: TranslateFn): string {
  switch (status) {
    case "active":
      return t("portal.employees.statusActive")
    case "probation":
      return t("portal.employees.statusProbation")
    case "suspended":
      return t("portal.employees.statusSuspended")
    case "inactive":
      return t("portal.employees.statusInactive")
    default:
      return status
  }
}

export function employmentTypeLabel(type: string, t: TranslateFn): string {
  switch (type) {
    case "full_time":
      return t("portal.employees.typeFullTime")
    case "part_time":
      return t("portal.employees.typePartTime")
    case "contract":
      return t("portal.employees.typeContract")
    case "intern":
      return t("portal.employees.typeIntern")
    default:
      return type
  }
}

export function genderLabel(gender: string, t: TranslateFn): string {
  switch (gender) {
    case "male":
      return t("portal.employees.genderMale")
    case "female":
      return t("portal.employees.genderFemale")
    case "other":
      return t("portal.employees.genderOther")
    default:
      return gender
  }
}

export function codeBadgeClass(): string {
  return cn("font-mono text-[11px] font-semibold tracking-wide text-primary")
}
