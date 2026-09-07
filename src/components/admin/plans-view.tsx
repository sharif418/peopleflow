"use client"

// Plans section — read-only plan catalogue cards
import { useQuery } from "@tanstack/react-query"
import { Check, CreditCard, Info, Sparkles, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { apiFetch } from "@/lib/fetcher"
import { useI18n } from "@/lib/i18n"
import { formatBdt, formatNumber } from "@/lib/format"
import { FEATURE_MAP } from "@/lib/features"
import { cn } from "@/lib/utils"
import type { PlanResponse } from "./types"

export function PlansView() {
  const { t, lang } = useI18n()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => apiFetch<PlanResponse[]>("/api/admin/plans"),
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("admin.plans.title")}
        subtitle={t("admin.plans.subtitle")}
        icon={CreditCard}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-muted-foreground">{t("admin.plans.customizationNote")}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3.5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError || !data ? (
        <EmptyState
          title={t("admin.common.errorTitle")}
          description={t("admin.common.errorDesc")}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("admin.common.retry")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {data.map((plan) => (
            <Card
              key={plan.key}
              className={cn(
                "relative border-border/80 shadow-xs transition-shadow hover:shadow-sm",
                plan.highlight && "border-primary/50 ring-1 ring-primary/30",
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-2.5 left-4 gap-1 bg-primary text-primary-foreground">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {t("admin.plans.popular")}
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{lang === "bn" ? plan.nameBn : plan.nameEn}</span>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    {formatNumber(plan.orgsCount, lang)} {t("common.organization")}
                  </Badge>
                </CardTitle>
                <CardDescription>{lang === "bn" ? plan.taglineBn : plan.taglineEn}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-bold tracking-tight tabular-nums text-primary">
                  {formatBdt(plan.priceBdt, lang)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {t("admin.plans.perMonth")}
                  </span>
                </p>

                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {plan.maxEmployees === -1
                    ? t("admin.plans.unlimited")
                    : t("admin.plans.employeesUpTo", { max: formatNumber(plan.maxEmployees, lang) })}
                </p>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("admin.plans.includes")} ({formatNumber(plan.features.length, lang)})
                  </p>
                  <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-1">
                    {plan.features.map((featureKey) => {
                      const feature = FEATURE_MAP[featureKey]
                      return (
                        <li key={featureKey} className="flex items-center gap-1.5 text-sm">
                          <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                          <span className="truncate">
                            {feature
                              ? lang === "bn"
                                ? feature.nameBn
                                : feature.nameEn
                              : featureKey}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
