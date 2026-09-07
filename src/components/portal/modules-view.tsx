"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, LayoutGrid, Lock, Sparkles, Unlock } from "lucide-react"
import { useSessionStore } from "@/store/session"
import { useI18n } from "@/lib/i18n"
import { FEATURES, FEATURE_CATEGORY_LABELS, PLANS, planFor, type FeatureDef } from "@/lib/features"
import { formatBdt, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import type { PortalSection } from "./types"

function UpgradeDialog({
  feature,
  open,
  onOpenChange,
}: {
  feature: FeatureDef | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { org } = useSessionStore()
  const { lang, t } = useI18n()
  if (!feature || !org) return null

  const currentPlan = planFor(org.planKey)
  const currentIndex = PLANS.findIndex((p) => p.key === currentPlan.key)
  const nextPlan = currentIndex >= 0 && currentIndex < PLANS.length - 1 ? PLANS[currentIndex + 1] : null
  const newlyUnlocked = nextPlan ? nextPlan.features.filter((f) => !currentPlan.features.includes(f)) : []
  const upgradedCount = Math.max(newlyUnlocked.length, 1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="size-5 text-primary" aria-hidden />
            {t("portal.modules.upgrade")}
          </DialogTitle>
          <DialogDescription>
            {t("portal.modules.upgradeHint", { n: formatNumber(upgradedCount, lang) })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Current plan */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">{t("portal.modules.currentPlan")}</p>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="text-base font-semibold">{lang === "bn" ? currentPlan.nameBn : currentPlan.nameEn}</p>
              <p className="text-sm tabular-nums">
                {formatBdt(currentPlan.priceBdt, lang)}
                <span className="text-xs text-muted-foreground">{t("portal.modules.perMonth")}</span>
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {currentPlan.maxEmployees === -1
                ? `${t("portal.modules.maxEmployees")}: ${t("portal.modules.unlimited")}`
                : `${t("portal.modules.maxEmployees")}: ${formatNumber(currentPlan.maxEmployees, lang)}`}
            </p>
          </div>

          {/* Next plan */}
          {nextPlan ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-primary">{t("portal.modules.nextPlan")}</p>
                <Badge className="bg-primary text-primary-foreground">
                  <Sparkles className="size-3" aria-hidden />
                  {lang === "bn" ? nextPlan.nameBn : nextPlan.nameEn}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm tabular-nums">
                {formatBdt(nextPlan.priceBdt, lang)}
                <span className="text-xs text-muted-foreground">{t("portal.modules.perMonth")}</span>
              </p>
              <p className="mt-3 text-xs font-semibold">{t("portal.modules.unlocks")}:</p>
              <ul className="mt-1.5 space-y-1">
                {newlyUnlocked.map((key) => {
                  const f = FEATURES.find((x) => x.key === key)
                  if (!f) return null
                  return (
                    <li key={key} className="flex items-center gap-1.5 text-sm">
                      <Check className="size-3.5 shrink-0 text-success" aria-hidden />
                      {lang === "bn" ? f.nameBn : f.nameEn}
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                {nextPlan.maxEmployees === -1
                  ? `${t("portal.modules.maxEmployees")}: ${t("portal.modules.unlimited")}`
                  : `${t("portal.modules.maxEmployees")}: ${formatNumber(nextPlan.maxEmployees, lang)}`}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-center">
              <p className="text-sm font-semibold">{t("portal.modules.topPlan")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("portal.modules.topPlanDesc")}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("portal.common.close")}
          </Button>
          <Button
            onClick={() => {
              toast.success(t("portal.modules.requestSent"))
              onOpenChange(false)
            }}
          >
            {t("portal.modules.contactSales")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ModulesView({ onNavigate }: { onNavigate: (s: PortalSection) => void }) {
  const { org } = useSessionStore()
  const { lang, t } = useI18n()
  const [upgradeFeature, setUpgradeFeature] = useState<FeatureDef | null>(null)

  const flags = org?.featureFlags ?? {}

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("portal.modules.title")}
        subtitle={t("portal.modules.subtitle")}
        icon={LayoutGrid}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FEATURES.map((f) => {
          const enabled = flags[f.key] === true
          const name = lang === "bn" ? f.nameBn : f.nameEn
          const desc = lang === "bn" ? f.descBn : f.descEn
          const Icon = f.icon
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                if (enabled) onNavigate(`feature:${f.key}`)
                else setUpgradeFeature(f)
              }}
              aria-label={name}
              className={cn(
                "text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                "rounded-xl transition-all",
                enabled
                  ? "cursor-pointer border border-border/80 bg-card p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md"
                  : "cursor-pointer border border-dashed border-border bg-muted/20 p-4 hover:border-primary/40 hover:bg-primary/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </div>
                {enabled ? (
                  <Badge variant="secondary" className="border-success/30 bg-success/15 text-success">
                    {t("portal.modules.enabled")}
                  </Badge>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <Lock className="size-3" aria-hidden />
                    {t("portal.modules.locked")}
                  </span>
                )}
              </div>
              <p className={cn("mt-3 truncate text-sm font-semibold", !enabled && "text-muted-foreground")}>
                {name}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{desc}</p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {lang === "bn"
                  ? FEATURE_CATEGORY_LABELS[f.category].bn
                  : FEATURE_CATEGORY_LABELS[f.category].en}
              </p>
              {!enabled && (
                <Badge variant="outline" className="mt-2 border-primary/40 bg-primary/5 text-primary">
                  🔒 {t("portal.modules.upgrade")}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {upgradeFeature && (
        <UpgradeDialog
          feature={upgradeFeature}
          open={upgradeFeature !== null}
          onOpenChange={(o) => {
            if (!o) setUpgradeFeature(null)
          }}
        />
      )}
    </div>
  )
}
