"use client"

// Appraisals tab — filter chips, search, paginated appraisal cards
// (employee, period, overall score stars, status badge), create + review dialogs.
import { useDeferredValue, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, ClipboardCheck, Plus, Search, Star, X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import {
  PERFORMANCE_ENDPOINTS,
  performanceKeys,
  type AppraisalRow,
  type AppraisalsData,
} from "./types"
import {
  appraisalStatusBadgeClass,
  appraisalStatusLabel,
  scoreColorClass,
  scoreStarsText,
} from "./utils"
import { AppraisalFormDialog } from "./appraisal-form-dialog"
import { AppraisalReviewDialog } from "./appraisal-review-dialog"

const PAGE_SIZE = 8
const CHIPS = [
  { value: "", key: "portal.performance.appraisalFilter.all" },
  { value: "draft", key: "portal.performance.appraisalFilter.draft" },
  { value: "in_review", key: "portal.performance.appraisalFilter.in_review" },
  { value: "final", key: "portal.performance.appraisalFilter.final" },
] as const

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
}

export function AppraisalsTab() {
  const { lang, t } = useI18n()

  const [statusFilter, setStatusFilter] = useState("")
  const [qInput, setQInput] = useState("")
  const q = useDeferredValue(qInput)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [reviewId, setReviewId] = useState<string | null>(null)

  const filters = { status: statusFilter, employeeId: "", q, page }
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: performanceKeys.appraisals(filters),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), q })
      if (statusFilter) params.set("status", statusFilter)
      return apiFetch<AppraisalsData>(`${PERFORMANCE_ENDPOINTS.appraisals}?${params.toString()}`)
    },
    placeholderData: (prev) => prev,
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = q !== "" || statusFilter !== ""
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      {/* Filter chips + search + create */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("portal.common.status")}>
          {CHIPS.map((chip) => (
            <button
              type="button"
              key={chip.value || "all"}
              onClick={() => {
                setStatusFilter(chip.value)
                setPage(1)
              }}
              aria-pressed={statusFilter === chip.value}
              className={cn(
                "min-h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                statusFilter === chip.value
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {t(chip.key)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={qInput}
              onChange={(e) => {
                setQInput(e.target.value)
                setPage(1)
              }}
              placeholder={t("portal.performance.appraisals.searchPlaceholder")}
              className="h-10 pl-9"
              aria-label={t("portal.performance.appraisals.searchPlaceholder")}
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
          <Button className="h-10 shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("portal.performance.newAppraisal")}</span>
          </Button>
        </div>
      </div>

      {/* Result summary */}
      <p className="text-sm text-muted-foreground">
        {data ? t("portal.performance.appraisals.total", { n: formatNumber(total, lang) }) : " "}
      </p>

      {/* List */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
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
      ) : total === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={hasFilters ? t("portal.performance.appraisals.noResults") : t("portal.performance.appraisals.noAppraisals")}
          description={
            hasFilters
              ? t("portal.performance.appraisals.noResultsDesc")
              : t("portal.performance.appraisals.noAppraisalsDesc")
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQInput("")
                  setStatusFilter("")
                  setPage(1)
                }}
              >
                {t("portal.performance.appraisals.clearFilters")}
              </Button>
            ) : (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden />
                {t("portal.performance.newAppraisal")}
              </Button>
            )
          }
        />
      ) : (
        <motion.div
          key={`${page}-${statusFilter}-${q}`}
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {items.map((a) => (
            <motion.div key={a.id} variants={itemVariants}>
              <AppraisalCard appraisal={a} onOpen={() => setReviewId(a.id)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {total > 0 && data && (
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("portal.performance.appraisals.showing")}{" "}
            {formatNumber((data.page - 1) * PAGE_SIZE + 1, lang)}–
            {formatNumber(Math.min(data.page * PAGE_SIZE, total), lang)}{" "}
            {t("portal.performance.appraisals.of")} {formatNumber(total, lang)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t("portal.performance.appraisals.prev")}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              {t("portal.performance.appraisals.page")} {formatNumber(page, lang)}/
              {formatNumber(totalPages, lang)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t("portal.performance.appraisals.next")}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AppraisalFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {reviewId && (
        <AppraisalReviewDialog
          key={reviewId}
          open
          onOpenChange={(o) => {
            if (!o) setReviewId(null)
          }}
          appraisalId={reviewId}
        />
      )}
    </div>
  )
}

function AppraisalCard({ appraisal, onOpen }: { appraisal: AppraisalRow; onOpen: () => void }) {
  const { lang, t } = useI18n()
  const name = `${appraisal.employee.firstName} ${appraisal.employee.lastName}`

  return (
    <Card className="pf-card-hover border-border/80 bg-card shadow-xs">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        {/* Identity + period */}
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-mono font-semibold text-primary">{appraisal.employee.employeeCode}</span>
              {appraisal.employee.designation && ` · ${appraisal.employee.designation.name}`}
            </p>
          </div>
          <Badge variant="secondary" className="ml-1 shrink-0 whitespace-nowrap font-mono">
            {appraisal.period}
          </Badge>
        </div>

        {/* Score + status + action */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5" title={t("portal.performance.appraisals.overallScore")}>
            <Star className="size-4 shrink-0 fill-primary text-primary" aria-hidden />
            <span className={cn("text-sm font-semibold tabular-nums", scoreColorClass(appraisal.overallScore))}>
              {formatNumber(Math.round(appraisal.overallScore * 10) / 10, lang)}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums" aria-hidden>
              {scoreStarsText(appraisal.overallScore)}
            </span>
          </div>
          <Badge variant="outline" className={cn("shrink-0 whitespace-nowrap", appraisalStatusBadgeClass(appraisal.status))}>
            {appraisalStatusLabel(appraisal.status, t)}
          </Badge>
          <Button variant="outline" className="h-10" onClick={onOpen}>
            {t("portal.performance.appraisals.openReview")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
