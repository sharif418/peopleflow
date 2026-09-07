"use client"

// Overview section — KPI stats, revenue chart, plan distribution, recent orgs & activity
import { useQuery } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Banknote, Building2, CheckCircle2, Users, type LucideIcon } from "lucide-react"
import { format } from "date-fns"
import { bn as bnLocale, enUS } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { apiFetch } from "@/lib/fetcher"
import { useI18n } from "@/lib/i18n"
import { formatBdt, formatDateTime, formatNumber, toBnDigits } from "@/lib/format"
import { PLAN_MAP } from "@/lib/features"
import { Button } from "@/components/ui/button"
import { OrgStatusBadge, PlanBadge } from "./badges"
import { ACTION_ICONS, actionLabel } from "./action-utils"
import type { StatsResponse } from "./types"
import type { Lang } from "@/lib/types"

interface TooltipPayloadItem {
  value?: number | string
  payload?: { label: string; amount?: number; count?: number; planKey?: string }
}
interface TooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function monthLabel(period: string, lang: Lang): string {
  const d = new Date(`${period}-01T00:00:00`)
  if (Number.isNaN(d.getTime())) return period
  return format(d, "MMM", { locale: lang === "bn" ? bnLocale : enUS })
}

function compactBdt(v: number, lang: Lang): string {
  if (v >= 1000) return `৳${toBnDigits(`${(v / 1000).toFixed(1)}k`)}`.replace("৳", "৳")
  return `৳${formatNumber(v, lang)}`
}

function RevenueTooltip({ active, payload }: TooltipProps) {
  const { lang } = useI18n()
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{row.label}</p>
      <p className="mt-0.5 tabular-nums text-primary">{formatBdt(row.amount ?? 0, lang)}</p>
    </div>
  )
}

function PlanTooltip({ active, payload }: TooltipProps) {
  const { lang } = useI18n()
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const plan = PLAN_MAP[row.planKey ?? ""]
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">
        {plan ? (lang === "bn" ? plan.nameBn : plan.nameEn) : row.planKey}
      </p>
      <p className="mt-0.5 tabular-nums text-muted-foreground">
        {formatNumber(row.count ?? 0, lang)}
      </p>
    </div>
  )
}

function ChartCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  )
}

export function OverviewView({ onOpenOrg }: { onOpenOrg: (orgId: string) => void }) {
  const { t, lang } = useI18n()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => apiFetch<StatsResponse>("/api/admin/stats"),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2.5 h-8 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        title={t("admin.common.errorTitle")}
        description={t("admin.common.errorDesc")}
        action={
          <Button variant="outline" onClick={() => void refetch()}>
            {t("admin.common.retry")}
          </Button>
        }
      />
    )
  }

  const revenueData = data.revenueByMonth.map((r) => ({
    ...r,
    label: monthLabel(r.period, lang),
  }))
  const planData = data.orgsByPlan
    .filter((p) => p.count > 0)
    .map((p) => ({
      ...p,
      label: lang === "bn" ? (PLAN_MAP[p.planKey]?.nameBn ?? p.planKey) : (PLAN_MAP[p.planKey]?.nameEn ?? p.planKey),
    }))

  const stats: { key: string; value: string; icon: LucideIcon; tint?: string }[] = [
    { key: "totalOrgs", value: formatNumber(data.orgsTotal, lang), icon: Building2 },
    { key: "activeOrgs", value: formatNumber(data.orgsActive, lang), icon: CheckCircle2, tint: "bg-success/10 text-success" },
    { key: "mrr", value: formatBdt(data.mrr, lang), icon: Banknote },
    { key: "totalEmployees", value: formatNumber(data.employeesTotal, lang), icon: Users },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPI stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard
            key={s.key}
            title={t(`admin.dashboard.${s.key}`)}
            value={s.value}
            icon={s.icon}
            iconClassName={s.tint}
          />
        ))}
      </div>

      {/* Revenue + plan distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.dashboard.revenueTitle")}</CardTitle>
            <CardDescription>{t("admin.dashboard.revenueDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <AreaChart data={revenueData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  width={52}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => compactBdt(v, lang)}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "var(--border)" }} />
                <Area
                  dataKey="amount"
                  type="monotone"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#revFill)"
                />
              </AreaChart>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.dashboard.planDistribution")}</CardTitle>
            <CardDescription>
              {formatNumber(data.orgsTotal, lang)} {t("admin.dashboard.distributionTotal")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {planData.length === 0 ? (
              <EmptyState title={t("admin.common.noDataTitle")} />
            ) : (
              <div className="flex h-64 w-full flex-col items-center justify-center gap-4 sm:flex-row">
                <div className="h-52 w-52 shrink-0">
                  <PieChart>
                    <Tooltip content={<PlanTooltip />} />
                    <Pie
                      data={planData}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {planData.map((entry, i) => (
                        <Cell key={entry.planKey} fill={`var(--chart-${(i % 5) + 1})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <ul className="w-full max-w-44 space-y-2.5">
                  {planData.map((entry, i) => (
                    <li key={entry.planKey} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: `var(--chart-${(i % 5) + 1})` }}
                          aria-hidden
                        />
                        <span className="truncate">{entry.label}</span>
                      </span>
                      <span className="tabular-nums font-medium">{formatNumber(entry.count, lang)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orgs + activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.dashboard.recentOrgs")}</CardTitle>
            <CardDescription>{t("admin.dashboard.recentOrgsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {data.recentOrgs.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState title={t("admin.common.noDataTitle")} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">{t("admin.dashboard.orgName")}</TableHead>
                    <TableHead>{t("admin.dashboard.orgPlan")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("admin.dashboard.orgStatus")}</TableHead>
                    <TableHead className="text-right">{t("admin.dashboard.orgEmployees")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrgs.map((org) => (
                    <TableRow
                      key={org.id}
                      className="cursor-pointer"
                      onClick={() => onOpenOrg(org.id)}
                    >
                      <TableCell className="max-w-40 truncate pl-6 font-medium" title={org.name}>
                        {org.name}
                      </TableCell>
                      <TableCell>
                        <PlanBadge planKey={org.planKey} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <OrgStatusBadge status={org.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(org.employeesCount, lang)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.dashboard.recentActivity")}</CardTitle>
            <CardDescription>{t("admin.dashboard.recentActivityDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState title={t("admin.dashboard.noActivity")} />
            ) : (
              <ul className="max-h-96 space-y-1 overflow-y-auto pr-1 pf-scrollbar">
                {data.recentActivity.map((log) => {
                  const Icon = ACTION_ICONS[log.action] ?? CheckCircle2
                  return (
                    <li
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">
                          {actionLabel(t, log.action)}
                          <span className="font-normal text-muted-foreground"> · {log.actor}</span>
                        </p>
                        {log.details && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={log.details}>
                            {log.details}
                          </p>
                        )}
                      </div>
                      <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatDateTime(log.createdAt, lang)}
                      </time>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
