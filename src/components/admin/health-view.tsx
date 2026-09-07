"use client"

// Server Health section — engine card, metrics with sparklines, sites table, app info
import { useQuery } from "@tanstack/react-query"
import { CartesianGrid, Line, LineChart, Tooltip, XAxis } from "recharts"
import { Activity, Cpu, Database, Gauge, HardDrive, MemoryStick, ServerCog } from "lucide-react"
import { format } from "date-fns"
import { bn as bnLocale, enUS } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { apiFetch } from "@/lib/fetcher"
import { useI18n } from "@/lib/i18n"
import { formatNumber, toBnDigits } from "@/lib/format"
import { OrgStatusBadge } from "./badges"
import { cn } from "@/lib/utils"
import type { HealthResponse } from "./types"

function MetricTooltip({ active, payload }: { active?: boolean; payload?: { value?: number }[] }) {
  const { lang } = useI18n()
  if (!active || !payload?.length) return null
  const v = payload[0]?.value
  if (v === undefined) return null
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md tabular-nums">
      {toBnDigits(v)}%
    </div>
  )
}

const METRIC_ICONS = { cpu: Cpu, ram: MemoryStick, disk: HardDrive } as const

export function HealthView() {
  const { t, lang } = useI18n()
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => apiFetch<HealthResponse>("/api/admin/health"),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-16 w-full max-w-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
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

  const lastCheck = dataUpdatedAt
    ? format(new Date(dataUpdatedAt), "HH:mm:ss", { locale: lang === "bn" ? bnLocale : enUS })
    : "—"

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("admin.health.title")}
        subtitle={t("admin.health.subtitle")}
        icon={Activity}
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="gap-1.5">
            <Gauge className="h-4 w-4" aria-hidden />
            {t("admin.common.refresh")}
          </Button>
        }
      />

      {/* Engine + uptime */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-border/80 shadow-xs lg:col-span-2">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-6">
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                data.engine === "mock" ? "bg-warning/15 text-warning" : "bg-success/15 text-success",
              )}
            >
              <ServerCog className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{t("admin.health.engine")}</p>
                <Badge
                  variant="outline"
                  className={
                    data.engine === "mock"
                      ? "border-warning/40 bg-warning/15 text-warning"
                      : "border-success/30 bg-success/10 text-success"
                  }
                >
                  {data.engine === "mock" ? t("admin.health.mockMode") : t("admin.health.liveMode")}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.engine === "mock" ? t("admin.health.mockBadge") : t("admin.health.liveBadge")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="flex flex-col items-center justify-center gap-1 p-4 sm:p-6">
            <p className="text-xs text-muted-foreground">{t("admin.health.uptime")}</p>
            <p className="text-2xl font-bold tabular-nums text-success">
              {toBnDigits(data.uptimePercent)}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("admin.health.last6h")} · {lastCheck}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Metrics with sparklines */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {data.metrics.map((metric) => {
          const Icon = METRIC_ICONS[metric.key as keyof typeof METRIC_ICONS] ?? Gauge
          const series = metric.series.map((v, i) => ({ i, v }))
          return (
            <Card key={metric.key} className="border-border/80 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    {t(`admin.health.${metric.key}`)}
                  </span>
                  <span className="tabular-nums text-base font-bold">
                    {toBnDigits(metric.value)}
                    {metric.unit}
                  </span>
                </CardTitle>
                <CardDescription>{t("admin.health.last6h")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-16 w-full">
                  <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="i" hide />
                    <Tooltip content={<MetricTooltip />} cursor={{ stroke: "var(--border)" }} />
                    <Line
                      dataKey="v"
                      type="monotone"
                      stroke="var(--primary)"
                      strokeWidth={1.8}
                      dot={false}
                    />
                  </LineChart>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tenant sites */}
      <Card className="border-border/80 py-0 shadow-xs">
        <CardHeader className="px-6">
          <CardTitle className="text-base">{t("admin.health.sitesTitle")}</CardTitle>
          <CardDescription>{t("admin.health.sitesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.sites.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState icon={ServerCog} title={t("admin.health.noSites")} />
            </div>
          ) : (
            <div className="overflow-x-auto pf-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">{t("admin.orgs.colOrg")}</TableHead>
                    <TableHead>{t("admin.health.colSite")}</TableHead>
                    <TableHead>{t("admin.health.colStatus")}</TableHead>
                    <TableHead className="text-right">{t("admin.health.colLatency")}</TableHead>
                    <TableHead className="pr-6 text-right">{t("admin.health.colVersion")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sites.map((site) => (
                    <TableRow key={site.siteName}>
                      <TableCell className="max-w-44 truncate pl-6 font-medium" title={site.orgName}>
                        {site.orgName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{site.siteName}</TableCell>
                      <TableCell>
                        <OrgStatusBadge status={site.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={cn(
                            "font-medium",
                            site.latencyMs > 120 ? "text-warning" : "text-success",
                          )}
                        >
                          {formatNumber(site.latencyMs, lang)} {t("admin.health.latencyUnit")}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-right font-mono text-xs text-muted-foreground">
                        {site.version}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* App info */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-primary" aria-hidden />
            {t("admin.health.appInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">{t("admin.health.nodeVersion")}</dt>
              <dd className="mt-0.5 font-mono text-xs">{data.app.node}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("admin.health.nextVersion")}</dt>
              <dd className="mt-0.5 font-mono text-xs">{data.app.nextjs}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("admin.health.dbEngine")}</dt>
              <dd className="mt-0.5 font-mono text-xs uppercase">{data.app.db}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("admin.health.serverTime")}</dt>
              <dd className="mt-0.5 font-mono text-xs tabular-nums">{lastCheck}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
