"use client"

// ERPNext provisioning progress — step checklist driven by PROVISION_STEPS
import { Check, Loader2, PartyPopper } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { PROVISION_STEPS } from "@/lib/features"
import { formatNumber } from "@/lib/format"
import type { ProvisionState } from "@/lib/api-utils"

export function ProvisionProgress({ provision }: { provision: ProvisionState }) {
  const { t, lang } = useI18n()

  if (provision.status === "active") {
    return (
      <Card className="border-success/40 bg-success/5">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <PartyPopper className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-success">{t("admin.orgDetail.provisionDone")}</p>
            <p className="text-xs text-muted-foreground">{t("admin.orgDetail.provisionDoneDesc")}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{t("admin.orgDetail.provisionTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("admin.orgDetail.provisionDesc")}</p>
          </div>
          <p className="text-xs font-medium tabular-nums text-muted-foreground">
            {t("admin.orgDetail.provisionStep", {
              index: formatNumber(provision.stepIndex, lang),
              total: formatNumber(provision.totalSteps, lang),
            })}
          </p>
        </div>

        <Progress
          value={provision.progress}
          className="mt-3 h-2 [&>div]:bg-warning"
          aria-label={t("admin.orgDetail.provisionTitle")}
        />
        <p className="mt-1.5 text-right text-xs tabular-nums text-muted-foreground">
          {formatNumber(provision.progress, lang)}%
        </p>

        <ul className="mt-3 space-y-2">
          {PROVISION_STEPS.map((step, i) => {
            const done = provision.stepsDone.includes(step.key)
            const current = !done && i === provision.stepIndex
            return (
              <li key={step.key} className="flex items-center gap-2.5 text-sm">
                {done ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                ) : current ? (
                  <Loader2
                    className="h-5 w-5 shrink-0 animate-spin text-warning"
                    aria-hidden
                  />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border" aria-hidden />
                )}
                <span
                  className={cn(
                    "truncate",
                    done ? "text-foreground" : current ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {lang === "bn" ? step.bn : step.en}
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
