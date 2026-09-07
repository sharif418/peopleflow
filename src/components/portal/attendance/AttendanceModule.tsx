"use client"

// Attendance module shell (হাজিরা) — stats, device cards, today/month tabs
// Default export: wired into the portal nav by the main agent (Task 4).
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { AlarmClock, CalendarCheck2, CalendarDays, CalendarOff, UserCheck, UserX } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import {
  ATT_ENDPOINTS,
  attendanceKeys,
  currentMonth,
  localIsoToday,
  type AttendanceDayData,
} from "./attendance-types"
import { DeviceCards } from "./device-cards"
import { TodayTab } from "./today-view"
import { MonthTab } from "./month-view"

function StatsRow({ date }: { date: string }) {
  const { lang, t } = useI18n()
  const { data } = useQuery({
    queryKey: attendanceKeys.day(date),
    queryFn: () => apiFetch<AttendanceDayData>(`${ATT_ENDPOINTS.day}?date=${date}`),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  })

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  const present = data.stats.present + data.stats.halfDay
  const total = data.items.length

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("portal.attendance.stats.present")}
          value={formatNumber(present, lang)}
          icon={UserCheck}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title={t("portal.attendance.stats.late")}
          value={formatNumber(data.stats.late, lang)}
          icon={AlarmClock}
          iconClassName="bg-warning/10 text-warning-foreground"
        />
        <StatCard
          title={t("portal.attendance.stats.absent")}
          value={formatNumber(data.stats.absent, lang)}
          icon={UserX}
          iconClassName="bg-destructive/10 text-destructive"
        />
        <StatCard
          title={t("portal.attendance.stats.onLeave")}
          value={formatNumber(data.stats.onLeave, lang)}
          icon={CalendarOff}
          iconClassName="bg-teal-500/10 text-teal-600 dark:text-teal-400"
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
        {date === localIsoToday()
          ? `${t("portal.attendance.stats.todayDate")} · ${t("portal.attendance.stats.ofTotal", { n: formatNumber(total, lang) })}`
          : t("portal.attendance.stats.ofTotal", { n: formatNumber(total, lang) })}
      </p>
    </div>
  )
}

export default function AttendanceModule() {
  const { t } = useI18n()
  const [tab, setTab] = useState<"today" | "month">("today")
  const [date, setDate] = useState(() => localIsoToday())
  const [month, setMonth] = useState(() => currentMonth())

  const handleDateChange = (d: string) => {
    setDate(d)
    const m = d.slice(0, 7)
    setMonth((prev) => (prev === m ? prev : m))
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("portal.attendance.title")} subtitle={t("portal.attendance.subtitle")} icon={CalendarCheck2} />

      <StatsRow date={date} />

      <DeviceCards />

      <Tabs value={tab} onValueChange={(v) => setTab(v === "month" ? "month" : "today")}>
        <TabsList className="h-11 w-full grid grid-cols-2 sm:w-fit">
          <TabsTrigger value="today" className="min-h-9 px-4">
            <CalendarCheck2 className="size-4" aria-hidden />
            {t("portal.attendance.tabs.today")}
          </TabsTrigger>
          <TabsTrigger value="month" className="min-h-9 px-4">
            <CalendarDays className="size-4" aria-hidden />
            {t("portal.attendance.tabs.month")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-3">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <TodayTab date={date} onDateChange={handleDateChange} />
          </motion.div>
        </TabsContent>
        <TabsContent value="month" className="mt-3">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <MonthTab month={month} onMonthChange={setMonth} />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
