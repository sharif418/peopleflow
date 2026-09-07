"use client"

// Balances tab — year select + per-employee leave balances with progress bars.
// Mobile: stacked cards; desktop (md+): table with a column per leave type.
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Scale } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import { LEAVE_ENDPOINTS, leaveKeys, type LeaveBalanceRow, type LeaveBalancesData } from "./types"
import { progressRatio, progressToneClass } from "./utils"

function yearOptions(): string[] {
  const current = new Date().getFullYear()
  return [String(current), String(current - 1)]
}

function TypeBar({ row }: { row: LeaveBalanceRow }) {
  const { lang, t } = useI18n()
  const ratio = progressRatio(row.used, row.allocated)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs tabular-nums text-muted-foreground">
        <span>
          {formatNumber(row.used, lang)}/{formatNumber(row.allocated, lang)}
        </span>
        {row.pending > 0 && (
          <span className="text-warning-foreground">
            {t("portal.leave.balances.pendingNote", { n: formatNumber(row.pending, lang) })}
          </span>
        )}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={t("portal.leave.balances.barA11y", { type: row.name, used: formatNumber(row.used, lang), allocated: formatNumber(row.allocated, lang) })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", progressToneClass(ratio))}
          style={{ width: `${Math.max(3, Math.round(ratio * 100))}%` }}
        />
      </div>
    </div>
  )
}

export function BalancesTab() {
  const { lang, t } = useI18n()
  const [year, setYear] = useState(() => String(new Date().getFullYear()))

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: leaveKeys.balances(year),
    queryFn: () => apiFetch<LeaveBalancesData>(LEAVE_ENDPOINTS.balances(year)),
    placeholderData: (prev) => prev,
  })

  const items = data?.items ?? []
  const types = data?.types ?? []
  const years = yearOptions()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-10 w-32" aria-label={t("portal.leave.balances.yearLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y} className="tabular-nums">
                {formatNumber(Number(y), lang)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title={t("common.error")}
          description={t("portal.common.errorDesc")}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Scale}
          title={t("portal.leave.balances.noData")}
          description={t("portal.leave.balances.noDataDesc")}
        />
      ) : types.length === 0 ? (
        <EmptyState
          icon={Scale}
          title={t("portal.leave.types.noData")}
          description={t("portal.leave.types.noDataDesc")}
        />
      ) : (
        <motion.div
          key={year}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="max-h-[34rem] overflow-y-auto rounded-xl border border-border/80 bg-card shadow-xs pf-scrollbar"
        >
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-52 whitespace-nowrap text-xs font-semibold">
                    {t("portal.leave.balances.employeeCol")}
                  </TableHead>
                  {types.map((ty) => (
                    <TableHead key={ty.id} className="min-w-36 whitespace-nowrap text-xs font-semibold">
                      <span className="inline-block max-w-36 truncate align-middle">{ty.name}</span>
                    </TableHead>
                  ))}
                  <TableHead className="whitespace-nowrap text-right text-xs font-semibold">
                    {t("portal.leave.balances.totalUsedCol")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((emp) => (
                  <TableRow key={emp.employeeId}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 shrink-0">
                          <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
                            {initialsOf(emp.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{emp.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            <span className="font-mono font-semibold text-primary">{emp.code}</span>
                            {emp.department && ` · ${emp.department}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    {types.map((ty) => {
                      const row = emp.rows.find((r) => r.leaveTypeId === ty.id)
                      return (
                        <TableCell key={ty.id} className="py-3">
                          {row ? <TypeBar row={row} /> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      )
                    })}
                    <TableCell className="py-3 text-right text-sm font-semibold tabular-nums">
                      {formatNumber(emp.totalUsed, lang)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile stacked cards */}
          <div className="divide-y divide-border/60 md:hidden">
            {items.map((emp) => (
              <div key={emp.employeeId} className="space-y-3 p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
                      {initialsOf(emp.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{emp.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-mono font-semibold text-primary">{emp.code}</span>
                      {emp.department && ` · ${emp.department}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto shrink-0 tabular-nums">
                    {t("portal.leave.balances.totalLine", { n: formatNumber(emp.totalUsed, lang) })}
                  </Badge>
                </div>
                <div className="space-y-2.5">
                  {emp.rows.map((row) => (
                    <div key={row.leaveTypeId} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium">{row.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {t("portal.leave.balances.remaining")}:{" "}
                          <span className="font-medium tabular-nums text-foreground">
                            {formatNumber(row.remaining, lang)}
                          </span>
                        </span>
                      </div>
                      <TypeBar row={row} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
