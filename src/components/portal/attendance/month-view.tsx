"use client"

// Attendance module — "মাসিক রেজিস্টার" tab: month matrix (desktop) / accordion (mobile)
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { CalendarDays, ChevronDown, Users } from "lucide-react"
import { useI18n, type TranslateFn } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber, initialsOf, toBnDigits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import {
  ATT_ENDPOINTS,
  attendanceKeys,
  type AttendanceMonthData,
  type MonthDay,
  type MonthRow,
} from "./attendance-types"
import {
  attendanceMonthLabel,
  attendanceStatusLabel,
  dayOfWeekLabel,
  statusDotClass,
} from "./attendance-labels"
import type { Lang } from "@/lib/types"

const LEGEND: { dot: string; key: string }[] = [
  { dot: "bg-success", key: "portal.attendance.statuses.present" },
  { dot: "bg-warning", key: "portal.attendance.statuses.late" },
  { dot: "bg-destructive", key: "portal.attendance.statuses.absent" },
  { dot: "bg-teal-500", key: "portal.attendance.statuses.onLeave" },
  { dot: "bg-orange-500", key: "portal.attendance.statuses.halfDay" },
  { dot: "bg-muted-foreground/15", key: "portal.attendance.statuses.noRecord" },
  { dot: "bg-muted/70 border border-border", key: "portal.attendance.statuses.weekend" },
]

function hoursLabel(hours: number, lang: Lang): string {
  if (hours === 0) return "—"
  const num = lang === "bn" ? toBnDigits(hours) : String(hours)
  return `${num} ${lang === "bn" ? "ঘণ্টা" : "hrs"}`
}

interface DayEntry {
  status: string
  checkIn: string | null
  checkOut: string | null
}

function DayDot({ day, entry }: { day: MonthDay; entry: DayEntry | undefined }) {
  const { t } = useI18n()
  if (day.isWeekend) {
    return (
      <span
        title={`${day.date} · ${t("portal.attendance.statuses.weekend")}`}
        className="mx-auto block size-2.5 rounded-[3px] bg-muted-foreground/15"
      />
    )
  }
  if (!entry) {
    return (
      <span
        title={`${day.date} · ${t("portal.attendance.statuses.noRecord")}`}
        className="mx-auto block size-2.5 rounded-full bg-muted-foreground/15"
      />
    )
  }
  return (
    <span
      title={`${day.date}: ${entry.checkIn ?? "—"} → ${entry.checkOut ?? "—"} · ${attendanceStatusLabel(entry.status, t)}`}
      className={cn(
        "mx-auto block size-2.5 cursor-help rounded-full transition-transform hover:scale-125",
        statusDotClass(entry.status),
      )}
    />
  )
}

function summaryLine(row: MonthRow, t: TranslateFn, lang: Lang): string {
  const parts: string[] = []
  if (row.summary.present > 0)
    parts.push(`${t("portal.attendance.month.presentShort")} ${formatNumber(row.summary.present, lang)}`)
  if (row.summary.late > 0)
    parts.push(`${t("portal.attendance.month.lateShort")} ${formatNumber(row.summary.late, lang)}`)
  if (row.summary.absent > 0)
    parts.push(`${t("portal.attendance.month.absentShort")} ${formatNumber(row.summary.absent, lang)}`)
  if (row.summary.onLeave > 0)
    parts.push(`${t("portal.attendance.month.onLeaveShort")} ${formatNumber(row.summary.onLeave, lang)}`)
  if (row.summary.halfDays > 0)
    parts.push(`${t("portal.attendance.statuses.halfDay")} ${formatNumber(row.summary.halfDays, lang)}`)
  if (parts.length === 0 && row.summary.noRecord > 0)
    parts.push(`${t("portal.attendance.month.noRecordShort")} ${formatNumber(row.summary.noRecord, lang)}`)
  return parts.join(" · ")
}

export function MonthTab({
  month,
  onMonthChange,
}: {
  month: string
  onMonthChange: (m: string) => void
}) {
  const { lang, t } = useI18n()
  const [openId, setOpenId] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: attendanceKeys.month(month),
    queryFn: () => apiFetch<AttendanceMonthData>(`${ATT_ENDPOINTS.month}?month=${month}`),
    placeholderData: (prev) => prev,
  })

  const days = data?.days ?? []
  const rows = data?.rows ?? []
  const totals = data?.totals ?? { present: 0, late: 0, absent: 0, onLeave: 0 }
  const hasAnyLog = useMemo(() => rows.some((r) => Object.keys(r.byDate).length > 0), [rows])

  return (
    <motion.div
      key={month}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Controls + legend */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => e.target.value && onMonthChange(e.target.value)}
            className="h-10 w-[150px] font-mono"
            aria-label={t("portal.attendance.month.month")}
          />
          <p className="hidden min-w-0 truncate text-sm font-medium sm:block">
            {attendanceMonthLabel(month, lang)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5" aria-label={t("portal.attendance.month.legend")}>
          {LEGEND.map((l) => (
            <span key={l.key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("inline-block size-2.5 shrink-0 rounded-full", l.dot)} />
              {t(l.key)}
            </span>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title={t("common.error")}
          description={t("portal.attendance.errors.loadFailed")}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : !data || rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("portal.attendance.today.noEmployees")}
          description={t("portal.attendance.today.noEmployeesDesc")}
        />
      ) : !hasAnyLog ? (
        <EmptyState
          icon={CalendarDays}
          title={t("portal.attendance.month.emptyTitle")}
          description={t("portal.attendance.month.emptyDesc")}
        />
      ) : (
        <>
          {/* Desktop matrix — sticky employee column + sticky day header */}
          <div className="hidden overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs md:block">
            <div className="max-h-[560px] overflow-auto pf-scrollbar">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-20 min-w-[220px] border-b border-r border-border/70 bg-card px-3 py-2 text-left text-xs font-semibold">
                      {t("portal.attendance.month.employee")}
                    </th>
                    {days.map((d) => (
                      <th
                        key={d.date}
                        title={`${d.date} · ${dayOfWeekLabel(d.dayOfWeek, t)}`}
                        className={cn(
                          "sticky top-0 z-10 w-9 border-b border-border/70 px-0 py-2 text-center text-xs font-semibold tabular-nums",
                          d.isWeekend ? "bg-muted/60 text-muted-foreground" : "bg-card",
                        )}
                      >
                        {lang === "bn" ? toBnDigits(d.date.slice(8, 10)) : d.date.slice(8, 10)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.employeeId} className="group">
                      <td className="sticky left-0 z-10 border-b border-r border-border/60 bg-card px-3 py-1.5 group-hover:bg-muted/40">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7 shrink-0">
                            <AvatarFallback className="bg-primary/12 text-[10px] font-semibold text-primary">
                              {initialsOf(row.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="max-w-40 truncate text-[13px] font-medium" title={row.name}>
                              {row.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              <span className="font-mono font-semibold text-primary">{row.code}</span>
                              <span aria-hidden> · </span>
                              {summaryLine(row, t, lang)}
                            </p>
                          </div>
                        </div>
                      </td>
                      {days.map((d) => (
                        <td
                          key={d.date}
                          className={cn("border-b border-border/50 px-0 py-1.5 text-center", d.isWeekend && "bg-muted/40")}
                        >
                          <DayDot day={d} entry={row.byDate[d.date]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="sticky left-0 z-10 border-t border-border/70 bg-muted/50 px-3 py-2 text-xs font-semibold">
                      {t("portal.attendance.month.totalsRow")}
                    </td>
                    <td colSpan={days.length} className="border-t border-border/70 bg-muted/50 px-3 py-2">
                      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {t("portal.attendance.statuses.present")}:{" "}
                          <span className="font-semibold tabular-nums text-foreground">{formatNumber(totals.present, lang)}</span>
                        </span>
                        <span>
                          {t("portal.attendance.statuses.late")}:{" "}
                          <span className="font-semibold tabular-nums text-warning-foreground">{formatNumber(totals.late, lang)}</span>
                        </span>
                        <span>
                          {t("portal.attendance.statuses.absent")}:{" "}
                          <span className="font-semibold tabular-nums text-destructive">{formatNumber(totals.absent, lang)}</span>
                        </span>
                        <span>
                          {t("portal.attendance.statuses.onLeave")}:{" "}
                          <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-300">{formatNumber(totals.onLeave, lang)}</span>
                        </span>
                      </p>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Mobile accordion — dot strip + summary */}
          <div className="space-y-2.5 md:hidden">
            {rows.map((row) => {
              const open = openId === row.employeeId
              return (
                <Card key={row.employeeId} className="overflow-hidden border-border/80 bg-card shadow-xs">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : row.employeeId)}
                    aria-expanded={open}
                    className="flex min-h-11 w-full items-center gap-2.5 p-3.5 text-left transition-colors hover:bg-accent/40"
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
                        {initialsOf(row.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-mono font-semibold text-primary">{row.code}</span>
                        <span aria-hidden> · </span>
                        {summaryLine(row, t, lang)}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                      aria-hidden
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/60 p-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {days.map((d) => (
                              <DayDot key={d.date} day={d} entry={row.byDate[d.date]} />
                            ))}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
                            <p>
                              {t("portal.attendance.statuses.present")}:{" "}
                              <span className="font-semibold tabular-nums">{formatNumber(row.summary.present, lang)}</span>
                            </p>
                            <p>
                              {t("portal.attendance.statuses.late")}:{" "}
                              <span className="font-semibold tabular-nums">{formatNumber(row.summary.late, lang)}</span>
                            </p>
                            <p>
                              {t("portal.attendance.statuses.absent")}:{" "}
                              <span className="font-semibold tabular-nums">{formatNumber(row.summary.absent, lang)}</span>
                            </p>
                            <p>
                              {t("portal.attendance.statuses.onLeave")}:{" "}
                              <span className="font-semibold tabular-nums">{formatNumber(row.summary.onLeave, lang)}</span>
                            </p>
                            <p>
                              {t("portal.attendance.statuses.noRecord")}:{" "}
                              <span className="font-semibold tabular-nums">{formatNumber(row.summary.noRecord, lang)}</span>
                            </p>
                            <p>
                              {t("portal.attendance.month.workedHours")}:{" "}
                              <span className="font-semibold tabular-nums">{hoursLabel(row.summary.workedHours, lang)}</span>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}

            {/* Month totals (mobile) */}
            <Card className="border-border/80 bg-card shadow-xs">
              <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1.5 p-3.5 text-xs">
                <Badge variant="secondary" className="bg-primary/12 text-primary">
                  {t("portal.attendance.month.totals")}
                </Badge>
                <span>
                  {t("portal.attendance.statuses.present")}:{" "}
                  <span className="font-semibold tabular-nums">{formatNumber(totals.present, lang)}</span>
                </span>
                <span>
                  {t("portal.attendance.statuses.late")}:{" "}
                  <span className="font-semibold tabular-nums">{formatNumber(totals.late, lang)}</span>
                </span>
                <span>
                  {t("portal.attendance.statuses.absent")}:{" "}
                  <span className="font-semibold tabular-nums">{formatNumber(totals.absent, lang)}</span>
                </span>
                <span>
                  {t("portal.attendance.statuses.onLeave")}:{" "}
                  <span className="font-semibold tabular-nums">{formatNumber(totals.onLeave, lang)}</span>
                </span>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </motion.div>
  )
}
