"use client"

// Run payroll confirm dialog — summarizes the period, default structure and
// employee count before generating draft payslips.
import { Loader2, Zap } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatNumber } from "@/lib/format"
import { buttonVariants } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatPeriod } from "./labels"
import type { PayrollOverviewStats, SalaryStructureRow } from "./types"

export function RunPayrollDialog({
  open,
  onOpenChange,
  period,
  stats,
  defaultStructure,
  isPending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: string
  stats: PayrollOverviewStats | undefined
  defaultStructure: SalaryStructureRow | null
  isPending: boolean
  onConfirm: () => void
}) {
  const { lang, t } = useI18n()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Zap className="size-5 text-primary" aria-hidden />
            {t("portal.payroll.generateTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("portal.payroll.generateDesc", {
              period: formatPeriod(period, lang),
              count: formatNumber(stats?.employees ?? 0, lang),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/30 px-3.5 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-xs text-muted-foreground">{t("portal.payroll.generatePeriod")}</span>
            <span className="font-medium">{formatPeriod(period, lang)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-xs text-muted-foreground">{t("portal.payroll.generateStructure")}</span>
            <span className="max-w-[60%] truncate font-medium">
              {defaultStructure?.name ?? t("portal.payroll.generateStructureFallback")}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-xs text-muted-foreground">{t("portal.payroll.generateEmployees")}</span>
            <span className="font-medium tabular-nums">
              {formatNumber(stats?.employees ?? 0, lang)} {t("portal.common.person")}
            </span>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("portal.common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "default" })}
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isPending ? t("portal.payroll.generating") : t("portal.payroll.generateConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
