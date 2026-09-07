"use client"

// Org settings module — profile (read-only identity + editable contact),
// workweek weekends, payroll PF config, and org info card. Default export;
// cards live in co-located files.
import { useQuery } from "@tanstack/react-query"
import { Settings } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { PLANS } from "@/lib/features"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ProfileCard } from "./profile-card"
import { WorkweekCard } from "./workweek-card"
import { PayrollConfigCard } from "./payroll-config-card"
import { InfoCard } from "./info-card"
import type { OrgSettingsData } from "../payroll/types"

export default function OrgSettingsModule() {
  const { lang, t } = useI18n()

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["org", "settings"],
    queryFn: () => apiFetch<OrgSettingsData>("/api/org/settings"),
  })

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={Settings}
        title={t("portal.settings.loadFailed")}
        action={
          <Button variant="outline" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        }
      />
    )
  }

  const planDef = PLANS.find((p) => p.key === data.planKey)
  const planName = planDef ? (lang === "bn" ? planDef.nameBn : planDef.nameEn) : data.planKey

  return (
    <div className="space-y-6">
      <PageHeader title={t("portal.settings.title")} subtitle={t("portal.settings.subtitle")} icon={Settings} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProfileCard initial={data} />
        <WorkweekCard initial={data} />
        <PayrollConfigCard initial={data} />
        <InfoCard data={data} planName={planName} lang={lang} t={t} />
      </div>
    </div>
  )
}
