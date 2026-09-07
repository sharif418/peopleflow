"use client"

// Attendance module — "আজকের হাজিরা" tab: date picker, search, day grid, punch dialog
import { useDeferredValue, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { CalendarOff, Fingerprint, PenLine, Pencil, RefreshCw, Search, X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import {
  ATT_ENDPOINTS,
  attendanceKeys,
  localIsoToday,
  type AttendanceDayData,
  type AttendanceDayItem,
} from "./attendance-types"
import {
  attendanceDateLabel,
  attendanceStatusLabel,
  formatWorkedHours,
  statusBadgeClass,
} from "./attendance-labels"
import { PunchDialog } from "./punch-dialog"
import { useDeviceSync } from "./use-device-sync"

function SourceIcon({ source }: { source: string | null }) {
  const { t } = useI18n()
  if (source === "manual") {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground" title={t("portal.attendance.source.manual")}>
        <PenLine className="size-3.5" aria-hidden />
        <span className="text-[11px]">{t("portal.attendance.source.manual")}</span>
      </span>
    )
  }
  if (source === "device") {
    return (
      <span className="inline-flex items-center gap-1.5 text-success" title={t("portal.attendance.source.device")}>
        <Fingerprint className="size-3.5" aria-hidden />
        <span className="text-[11px]">{t("portal.attendance.source.device")}</span>
      </span>
    )
  }
  return <span className="text-muted-foreground/50">—</span>
}

function StatusBadge({ item, isToday }: { item: AttendanceDayItem; isToday: boolean }) {
  const { t } = useI18n()
  return (
    <Badge variant="secondary" className={cn("gap-1.5 border text-[11px] font-medium", statusBadgeClass(item.status))}>
      {isToday && item.status === "present" && (
        <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden />
      )}
      {attendanceStatusLabel(item.status, t)}
    </Badge>
  )
}

function MonoTime({ value }: { value: string | null }) {
  return (
    <span className={cn("font-mono text-[13px] tabular-nums", value ? "text-foreground" : "text-muted-foreground/50")}>
      {value ?? "—"}
    </span>
  )
}

export function TodayTab({
  date,
  onDateChange,
}: {
  date: string
  onDateChange: (d: string) => void
}) {
  const { lang, t } = useI18n()
  const [qInput, setQInput] = useState("")
  const q = useDeferredValue(qInput)
  const [editing, setEditing] = useState<AttendanceDayItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const sync = useDeviceSync()

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: attendanceKeys.day(date),
    queryFn: () => apiFetch<AttendanceDayData>(`${ATT_ENDPOINTS.day}?date=${date}`),
    placeholderData: (prev) => prev,
  })

  const items = useMemo(() => {
    const all = data?.items ?? []
    if (!q.trim()) return all
    const needle = q.trim().toLowerCase()
    return all.filter((i) =>
      `${i.firstName} ${i.lastName}`.toLowerCase().includes(needle) ||
      i.employeeCode.toLowerCase().includes(needle) ||
      (i.department ?? "").toLowerCase().includes(needle),
    )
  }, [data, q])

  const isToday = date === localIsoToday()
  const noRecordsAtAll =
    data && data.items.length > 0 && data.stats.noRecord === data.items.length

  const openPunch = (item: AttendanceDayItem) => {
    setEditing(item)
    setDialogOpen(true)
  }

  return (
    <motion.div
      key={date}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="h-10 w-[170px] font-mono"
            aria-label={t("portal.attendance.today.date")}
          />
          <p className="hidden min-w-0 truncate text-sm text-muted-foreground md:block">
            {attendanceDateLabel(date, lang)}
          </p>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t("portal.attendance.today.searchPlaceholder")}
            className="h-10 pl-9"
            aria-label={t("portal.attendance.today.searchPlaceholder")}
          />
          {qInput && (
            <button
              type="button"
              onClick={() => setQInput("")}
              aria-label={t("portal.common.close")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Weekend banner */}
      {data?.isWeekend && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
          <CalendarOff className="size-5 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-warning-foreground">{t("portal.attendance.today.weekendTitle")}</p>
            <p className="text-xs text-warning-foreground/80">{t("portal.attendance.today.weekendDesc")}</p>
          </div>
        </div>
      )}

      {/* No records CTA */}
      {noRecordsAtAll && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-5 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold">{t("portal.attendance.today.noRecordsTitle")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("portal.attendance.today.noRecordsDesc")}</p>
          </div>
          <Button disabled={sync.isPending} onClick={() => sync.mutate({ date })} className="shrink-0">
            <RefreshCw className={cn("size-4", sync.isPending && "animate-spin")} aria-hidden />
            {sync.isPending ? t("portal.attendance.sync.syncing") : t("portal.attendance.sync.syncNow")}
          </Button>
        </div>
      )}

      {/* Loading */}
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
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
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title={t("portal.attendance.today.noEmployees")}
          description={t("portal.attendance.today.noEmployeesDesc")}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("portal.attendance.today.noResultsTitle")}
          description={t("portal.attendance.today.noResultsDesc")}
          action={
            <Button variant="outline" onClick={() => setQInput("")}>
              {t("portal.employees.clearFilters")}
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs md:block">
            <div className="max-h-[560px] overflow-y-auto pf-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">{t("portal.attendance.today.employee")}</TableHead>
                    <TableHead className="text-xs font-semibold">{t("portal.attendance.today.checkIn")}</TableHead>
                    <TableHead className="text-xs font-semibold">{t("portal.attendance.today.checkOut")}</TableHead>
                    <TableHead className="text-xs font-semibold">{t("portal.attendance.today.statusCol")}</TableHead>
                    <TableHead className="text-xs font-semibold">{t("portal.attendance.today.worked")}</TableHead>
                    <TableHead className="hidden text-xs font-semibold lg:table-cell">{t("portal.attendance.today.source")}</TableHead>
                    <TableHead className="w-12 text-right text-xs font-semibold">{t("portal.common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const name = `${item.firstName} ${item.lastName}`
                    return (
                      <TableRow key={item.employeeId} className="cursor-default">
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8 shrink-0">
                              <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
                                {initialsOf(name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="max-w-48 truncate text-sm font-medium">{name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                <Badge variant="outline" className="mr-1.5 px-1.5 py-0 font-mono text-[10px] font-semibold tracking-wide text-primary">
                                  {item.employeeCode}
                                </Badge>
                                {item.department ?? t("portal.common.notSet")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><MonoTime value={item.checkIn} /></TableCell>
                        <TableCell><MonoTime value={item.checkOut} /></TableCell>
                        <TableCell><StatusBadge item={item} isToday={isToday} /></TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {formatWorkedHours(item.workedMinutes, lang)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell"><SourceIcon source={item.source} /></TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            aria-label={t("portal.attendance.today.editPunch")}
                            title={t("portal.attendance.today.editPunch")}
                            onClick={() => openPunch(item)}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="max-h-[560px] space-y-2.5 overflow-y-auto pf-scrollbar md:hidden">
            {items.map((item) => {
              const name = `${item.firstName} ${item.lastName}`
              return (
                <Card key={item.employeeId} className="border-border/80 bg-card shadow-xs">
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
                            {initialsOf(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            <span className="font-mono font-semibold text-primary">{item.employeeCode}</span>
                            <span aria-hidden> · </span>
                            {item.department ?? t("portal.common.notSet")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        aria-label={t("portal.attendance.today.editPunch")}
                        onClick={() => openPunch(item)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2.5">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("portal.attendance.today.inTime")}
                        </p>
                        <p className="mt-0.5 font-mono text-[13px] tabular-nums">{item.checkIn ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("portal.attendance.today.outTime")}
                        </p>
                        <p className="mt-0.5 font-mono text-[13px] tabular-nums">{item.checkOut ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("portal.attendance.today.worked")}
                        </p>
                        <p className="mt-0.5 text-[13px] font-medium tabular-nums">
                          {formatWorkedHours(item.workedMinutes, lang)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <StatusBadge item={item} isToday={isToday} />
                      <SourceIcon source={item.source} />
                    </div>

                    {item.note && (
                      <p className="mt-2 truncate rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground" title={item.note}>
                        {item.note}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground tabular-nums">
            {t("portal.attendance.stats.ofTotal", { n: formatNumber(data.items.length, lang) })}
          </p>
        </>
      )}

      <PunchDialog
        item={editing}
        date={date}
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setEditing(null)
        }}
      />
    </motion.div>
  )
}
