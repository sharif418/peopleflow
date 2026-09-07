"use client"

import { useQuery } from "@tanstack/react-query"
import { Banknote, CalendarCheck2, CalendarOff, Fingerprint, UserPlus, Users, UserRoundX, UsersRound, ArrowRight, CheckCheck } from "lucide-react"
import { useSessionStore } from "@/store/session"
import { useI18n } from "@/lib/i18n"
import { useRouter } from "next/navigation"
import { portalPath } from "@/lib/nav"
import { apiFetch } from "@/lib/fetcher"
import { formatBdt, formatDate, formatNumber, initialsOf, toBnDigits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { orgKeys } from "./api"
import { featureSection } from "./types"
import type { OverviewData, PortalSection } from "./types"

const chartConfig = {
  present: { label: "Present", color: "var(--chart-1)" },
  late: { label: "Late", color: "var(--chart-3)" },
  absent: { label: "Absent", color: "var(--chart-4)" },
} satisfies ChartConfig

function shortDate(date: string, lang: "bn" | "en"): string {
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  const s = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short" }).format(d)
  return lang === "bn" ? toBnDigits(s) : s
}

export function DashboardView() {
  const { lang, t } = useI18n()
  const { org } = useSessionStore()
  const router = useRouter()
  const orgKey = org?.subdomain || org?.id || ""
  const navigate = (s: PortalSection) => router.push(portalPath(orgKey, s))
  const flags = org?.featureFlags ?? {}
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: orgKeys.overview,
    queryFn: () => apiFetch<OverviewData>("/api/org/overview"),
  })

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        title={t("common.error")}
        description={t("portal.common.errorDesc")}
        action={
          <Button variant="outline" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        }
      />
    )
  }

  const presentToday = data.attendanceToday.present + data.attendanceToday.late
  const away = data.attendanceToday.onLeave + data.attendanceToday.absent
  const localConfig: ChartConfig = {
    present: { label: t("portal.dash.present"), color: "var(--chart-1)" },
    late: { label: t("portal.dash.late"), color: "var(--chart-3)" },
    absent: { label: t("portal.dash.absent"), color: "var(--chart-4)" },
  }

  const attendanceData = data.attendance.map((a) => ({
    date: shortDate(a.date, lang),
    present: a.present,
    late: a.late,
    absent: a.absent,
  }))

  const deptData = data.headcountByDept.map((d) => ({
    name: d.name ?? t("portal.common.notSet"),
    count: d.count,
  }))

  const salaryData = (data.salaryByDept ?? []).map((d) => ({
    name: d.name ?? t("portal.common.notSet"),
    total: Math.round(d.total / 1000), // display in thousands (৳ হাজার)
  }))

  const pendingLeave = data.pendingLeaveRequests ?? 0
  const attendanceEnabled = !!flags.attendance
  const leaveEnabled = !!flags.leave

  return (
    <div className="space-y-6">
      <PageHeader title={t("portal.dash.title")} subtitle={t("portal.dash.subtitle")} icon={Users} />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("portal.dash.totalEmployees")} value={formatNumber(data.employees.total, lang)} icon={Users} />
        <StatCard
          title={t("portal.dash.presentToday")}
          value={formatNumber(presentToday, lang)}
          icon={CalendarCheck2}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title={t("portal.dash.onLeaveOrAbsent")}
          value={formatNumber(away, lang)}
          icon={UserRoundX}
          iconClassName="bg-warning/10 text-warning"
        />
        <StatCard
          title={t("portal.dash.monthlyPayroll")}
          value={formatBdt(data.payrollMonthly, lang)}
          icon={Banknote}
        />
      </div>

      {/* Pending leave alert (feature-aware) */}
      {leaveEnabled && pendingLeave > 0 && (
        <button
          type="button"
          onClick={() => navigate(featureSection("leave"))}
          className="group flex w-full items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-left transition-all hover:border-warning/50 hover:bg-warning/15"
          aria-label={t("portal.dash.pendingLeaveAlert")}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
            <CalendarOff className="size-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {t("portal.dash.pendingLeaveAlert")}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {t("portal.dash.pendingLeaveAlertDesc", { n: formatNumber(pendingLeave, lang) })}
            </span>
          </span>
          <Badge className="shrink-0 border-warning/40 bg-warning/20 text-warning-foreground tabular-nums">
            {formatNumber(pendingLeave, lang)}
          </Badge>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("portal.dash.attendanceTrend")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("portal.dash.attendanceTrendSubtitle")}</p>
          </CardHeader>
          <CardContent>
            {attendanceData.length === 0 ? (
              <EmptyState
                icon={CalendarCheck2}
                title={t("portal.dash.noAttendance")}
                description={t("portal.dash.noAttendanceDesc")}
              />
            ) : (
              <ChartContainer config={localConfig} className="aspect-auto h-64 w-full">
                <LineChart data={attendanceData} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} width={40} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    dataKey="present"
                    type="monotone"
                    stroke="var(--color-present)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line dataKey="late" type="monotone" stroke="var(--color-late)" strokeWidth={2} dot={false} />
                  <Line
                    dataKey="absent"
                    type="monotone"
                    stroke="var(--color-absent)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("portal.dash.headcountByDept")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("portal.dash.headcountByDeptSubtitle")}</p>
          </CardHeader>
          <CardContent>
            {deptData.length === 0 ? (
              <EmptyState icon={UsersRound} title={t("portal.dash.noDepts")} description={t("portal.dash.noDeptData")} />
            ) : (
              <ChartContainer config={{ count: { label: t("portal.common.employeesCount"), color: "var(--chart-1)" } }} className="aspect-auto h-64 w-full">
                <BarChart data={deptData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Salary by department + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/80 shadow-xs lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("portal.dash.salaryByDept")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("portal.dash.salaryByDeptSubtitle")}</p>
          </CardHeader>
          <CardContent>
            {salaryData.length === 0 ? (
              <EmptyState icon={Banknote} title={t("portal.dash.noSalaryData")} />
            ) : (
              <ChartContainer
                config={{
                  total: { label: t("portal.dash.salaryThousands"), color: "var(--chart-2)" },
                }}
                className="aspect-auto h-64 w-full"
              >
                <BarChart data={salaryData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) =>
                          lang === "bn"
                            ? `${toBnDigits(String(Math.round(Number(value) * 1000) / 1000))} ৳ হাজার`
                            : `৳${value}k`
                        }
                      />
                    }
                    cursor={{ fill: "var(--muted)" }}
                  />
                  <Bar dataKey="total" fill="var(--chart-2)" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("portal.dash.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {attendanceEnabled && (
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 py-3"
                  onClick={() => navigate(featureSection("attendance"))}
                >
                  <Fingerprint className="size-5 shrink-0 text-primary" aria-hidden />
                  <span className="text-left">
                    <span className="block text-sm font-semibold">{t("portal.dash.viewAttendance")}</span>
                    <span className="block text-xs font-normal opacity-80">{t("portal.dash.viewAttendanceDesc")}</span>
                  </span>
                </Button>
              )}
              {leaveEnabled && (
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 py-3"
                  onClick={() => navigate(featureSection("leave"))}
                >
                  <CalendarOff className="size-5 shrink-0 text-primary" aria-hidden />
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{t("portal.dash.reviewLeave")}</span>
                      <span className="block truncate text-xs font-normal opacity-80">{t("portal.dash.reviewLeaveDesc")}</span>
                    </span>
                    {pendingLeave > 0 && (
                      <Badge className="shrink-0 border-warning/40 bg-warning/20 text-warning-foreground tabular-nums">
                        {formatNumber(pendingLeave, lang)}
                      </Badge>
                    )}
                  </span>
                </Button>
              )}
              <Button className="h-auto w-full justify-start gap-3 py-3" onClick={() => navigate("employees")}>
                <UserPlus className="size-5 shrink-0" aria-hidden />
                <span className="text-left">
                  <span className="block text-sm font-semibold">{t("portal.dash.addEmployee")}</span>
                  <span className="block text-xs font-normal opacity-80">{t("portal.dash.addEmployeeDesc")}</span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-3 py-3"
                onClick={() => navigate("modules")}
              >
                <ArrowRight className="size-5 shrink-0" aria-hidden />
                <span className="text-left">
                  <span className="block text-sm font-semibold">{t("portal.dash.viewModules")}</span>
                  <span className="block text-xs font-normal opacity-80">{t("portal.dash.viewModulesDesc")}</span>
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent hires */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/80 shadow-xs lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("portal.dash.recentHires")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("portal.dash.recentHiresSubtitle")}</p>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentHires.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState icon={Users} title={t("portal.dash.noHires")} />
              </div>
            ) : (
              <ul className="divide-y divide-border/70">
                {data.recentHires.map((h) => {
                  const name = `${h.firstName} ${h.lastName}`
                  return (
                    <li key={h.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 sm:px-6">
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">
                          {initialsOf(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {h.designation ?? t("portal.common.notSet")}
                          <span aria-hidden> · </span>
                          {h.department ?? t("portal.common.notSet")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium tabular-nums text-muted-foreground">
                          {formatDate(h.dateOfJoining, lang)}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70">{h.employeeCode}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Mini: view employees */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("portal.dash.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="h-auto w-full justify-start gap-3 py-3"
              onClick={() => navigate("employees")}
            >
              <Users className="size-5 shrink-0" aria-hidden />
              <span className="text-left">
                <span className="block text-sm font-semibold">{t("portal.dash.viewEmployees")}</span>
                <span className="block text-xs font-normal opacity-80">{t("portal.dash.viewEmployeesDesc")}</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto w-full justify-start gap-3 py-3"
              onClick={() => navigate("shifts")}
            >
              <CheckCheck className="size-5 shrink-0" aria-hidden />
              <span className="text-left">
                <span className="block text-sm font-semibold">{t("portal.dash.viewShifts")}</span>
                <span className="block text-xs font-normal opacity-80">{t("portal.dash.viewShiftsDesc")}</span>
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
