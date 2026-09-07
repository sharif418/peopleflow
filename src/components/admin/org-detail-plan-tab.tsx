"use client"

// Org detail plan tab — plan radio cards (BDT price + employee cap) and the
// "apply plan" action which opens the parent's confirm dialog.
import { Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt } from "@/lib/format"
import { PLANS } from "@/lib/features"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function OrgDetailPlanTab({
  currentPlanKey,
  pendingPlanKey,
  onSelect,
  onApply,
  isPending,
}: {
  currentPlanKey: string
  pendingPlanKey: string | null
  onSelect: (planKey: string) => void
  onApply: () => void
  isPending: boolean
}) {
  const { t, lang } = useI18n()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{t("admin.orgDetail.planTitle")}</h3>
        <p className="text-xs text-muted-foreground">{t("admin.orgDetail.planDesc")}</p>
      </div>
      <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((p) => {
          const selected = pendingPlanKey ?? currentPlanKey
          const isCurrent = p.key === selected
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={isCurrent}
              onClick={() => onSelect(p.key)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                isCurrent
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                  : "border-border/80 hover:border-primary/40 hover:shadow-xs",
              )}
            >
              <p className="text-sm font-semibold">{lang === "bn" ? p.nameBn : p.nameEn}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-primary">
                {formatBdt(p.priceBdt, lang)}
                <span className="text-xs font-normal text-muted-foreground">
                  {t("admin.plans.perMonth")}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.maxEmployees === -1
                  ? t("admin.plans.unlimited")
                  : t("admin.plans.employeesUpTo", { max: p.maxEmployees })}
              </p>
            </button>
          )
        })}
      </div>
      <Button
        className="w-full sm:w-auto"
        disabled={pendingPlanKey === null || pendingPlanKey === currentPlanKey || isPending}
        onClick={onApply}
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {t("admin.orgDetail.applyPlan")}
      </Button>
    </div>
  )
}
