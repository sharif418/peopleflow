"use client"

// Payslips tab — period quick jumps, overview stats, status chip + search
// toolbar, paginated payslip card grid with skeleton / error / empty states.
// All state and queries live in PayrollModule; this is presentational.
import type { Dispatch, SetStateAction } from "react"
import type { UseQueryResult } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, FileText, Search, X, Zap } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { formatPeriod, payslipStatusLabel } from "./labels"
import { PayrollOverview } from "./payroll-overview"
import { PayslipCard } from "./payslip-card"
import type { PayrollOverviewStats, PayslipsPage } from "./types"

const STATUS_FILTERS = ["", "draft", "confirmed", "paid"] as const

function statusFilterLabel(status: string, t: (k: string) => string): string {
  if (!status) return t("portal.payroll.filterAll")
  return payslipStatusLabel(status, t)
}

export function PayslipsTab({
  period,
  onPeriodSelect,
  periods,
  stats,
  statsPending,
  status,
  onStatusChange,
  qInput,
  onQInputChange,
  slipsQuery,
  pages,
  setPage,
  hasFilters,
  onClearFilters,
  onOpenSlip,
  onGenerate,
}: {
  period: string
  onPeriodSelect: (period: string) => void
  periods: string[] | undefined
  stats: PayrollOverviewStats | undefined
  statsPending: boolean
  status: string
  onStatusChange: (status: string) => void
  qInput: string
  onQInputChange: (q: string) => void
  slipsQuery: UseQueryResult<PayslipsPage, Error>
  pages: number
  setPage: Dispatch<SetStateAction<number>>
  hasFilters: boolean
  onClearFilters: () => void
  onOpenSlip: (id: string) => void
  onGenerate: () => void
}) {
  const { lang, t } = useI18n()

  return (
    <div className="space-y-4">
      {/* Period quick jumps */}
      {periods && periods.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t("portal.payroll.periodLabel")}:</span>
          {periods.slice(0, 6).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodSelect(p)}
              className={cn(
                "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors",
                p === period
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {formatPeriod(p, lang)}
            </button>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <PayrollOverview stats={stats} isPending={statsPending} />

      {/* Toolbar: status chips + search */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("portal.common.status")}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStatusChange(s)}
              aria-pressed={status === s}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                status === s
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {statusFilterLabel(s, t)}
              {s && stats ? (
                <span className="ml-1 tabular-nums opacity-70">
                  {formatNumber(
                    s === "draft"
                      ? stats.statusBreakdown.draft
                      : s === "confirmed"
                        ? stats.statusBreakdown.confirmed
                        : stats.statusBreakdown.paid,
                    lang,
                  )}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={qInput}
            placeholder={t("portal.payroll.searchPlaceholder")}
            onChange={(e) => onQInputChange(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
      </div>

      {/* Payslip cards */}
      {slipsQuery.isPending && !slipsQuery.data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : slipsQuery.isError || !slipsQuery.data ? (
        <EmptyState
          icon={FileText}
          title={t("portal.payroll.loadFailed")}
          action={
            <Button variant="outline" onClick={() => void slipsQuery.refetch()}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : slipsQuery.data.items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={Search}
            title={t("portal.payroll.noResultsTitle")}
            description={t("portal.payroll.noResultsDesc")}
            action={
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                <X className="size-4" aria-hidden />
                {t("portal.payroll.clearFilters")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title={t("portal.payroll.emptyTitle")}
            description={t("portal.payroll.emptyDesc")}
            action={
              <Button size="sm" onClick={onGenerate}>
                <Zap className="size-4" aria-hidden />
                {t("portal.payroll.generateBtn")}
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {slipsQuery.data.items.map((slip, i) => (
              <PayslipCard key={slip.id} slip={slip} index={i} onOpen={onOpenSlip} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {t("portal.payroll.pageOf", {
                page: formatNumber(slipsQuery.data.page, lang),
                pages: formatNumber(pages, lang),
              })}{" "}
              · {t("portal.payroll.totalOf", { total: formatNumber(slipsQuery.data.total, lang) })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={slipsQuery.data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" aria-hidden />
                {t("portal.payroll.prev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={slipsQuery.data.page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                {t("portal.payroll.next")}
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
