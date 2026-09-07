"use client"

// Org detail overview tab info card — site / subdomain / plan / dates on the
// left, admin user / employees / setup / bill on the right.
import { CalendarDays, CircleUserRound, ExternalLink, Globe, Info, PackageCheck, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt, formatDate, formatNumber } from "@/lib/format"
import { PLAN_MAP } from "@/lib/features"
import { Card, CardContent } from "@/components/ui/card"
import type { OrgDetailResponse } from "./types"

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Globe
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <span className="min-w-0 truncate text-right text-sm font-medium">{children}</span>
    </div>
  )
}

export function OrgDetailInfoCard({ data }: { data: OrgDetailResponse }) {
  const { t, lang } = useI18n()
  const org = data.org
  const plan = PLAN_MAP[org.planKey]

  return (
    <Card className="border-border/80 shadow-xs">
      <CardContent className="divide-y divide-border/70 p-0 sm:grid sm:grid-cols-2 sm:divide-x">
        <div className="px-4">
          <InfoRow icon={Globe} label={t("admin.orgDetail.site")}>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              {org.siteName ?? `${org.subdomain}.peopleflow.com`}
            </span>
          </InfoRow>
          <div className="border-t border-border/70" />
          <InfoRow icon={Info} label={t("admin.orgDetail.subdomain")}>
            <span className="font-mono text-xs">{org.subdomain}</span>
          </InfoRow>
          <div className="border-t border-border/70" />
          <InfoRow icon={PackageCheck} label={t("admin.orgDetail.plan")}>
            {lang === "bn" ? plan?.nameBn : plan?.nameEn} ·{" "}
            <span className="tabular-nums">{formatBdt(org.mrr, lang)}</span>
          </InfoRow>
          <div className="border-t border-border/70" />
          <InfoRow icon={CalendarDays} label={t("admin.orgDetail.created")}>
            {formatDate(org.createdAt, lang)}
          </InfoRow>
        </div>
        <div className="border-t border-border/70 sm:border-t-0">
          <InfoRow icon={CircleUserRound} label={t("admin.orgDetail.adminUser")}>
            {data.adminUser ? (
              <span className="truncate" title={`${data.adminUser.name} (${data.adminUser.email})`}>
                {data.adminUser.name}
              </span>
            ) : (
              "—"
            )}
          </InfoRow>
          <div className="border-t border-border/70" />
          <InfoRow icon={Users} label={t("admin.orgDetail.employees")}>
            <span className="tabular-nums">
              {formatNumber(data.employeesCount, lang)} {t("admin.common.people")}
            </span>
          </InfoRow>
          <div className="border-t border-border/70" />
          <InfoRow icon={PackageCheck} label={t("admin.orgDetail.setup")}>
            <span className={org.setupCompleted ? "text-success" : "text-warning"}>
              {org.setupCompleted ? t("admin.orgDetail.setupDone") : t("admin.orgDetail.setupPending")}
            </span>
          </InfoRow>
          <div className="border-t border-border/70" />
          <InfoRow icon={CalendarDays} label={t("admin.orgDetail.monthlyBill")}>
            <span className="tabular-nums">{formatBdt(plan?.priceBdt ?? 0, lang)}</span>
          </InfoRow>
        </div>
      </CardContent>
    </Card>
  )
}
