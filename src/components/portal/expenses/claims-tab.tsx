"use client"

// All-claims tab — status + category filter selects, search, staggered claim
// cards, review dialog, delete (submitted only), pagination.
import { useDeferredValue, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  EXPENSE_ENDPOINTS,
  expenseKeys,
  type ClaimRow,
  type ClaimsData,
} from "./types"
import { useClaimActions } from "./use-claim-actions"
import { ClaimCard } from "./claim-card"
import { ClaimReviewDialog } from "./claim-review-dialog"
import { ClaimsFilters } from "./claims-filters"

const PAGE_SIZE = 12

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
}

export function ClaimsTab() {
  const { lang, t } = useI18n()
  const { reviewMutation, deleteMutation, busyId } = useClaimActions()

  const [statusFilter, setStatusFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [qInput, setQInput] = useState("")
  const q = useDeferredValue(qInput)
  const [page, setPage] = useState(1)
  const [review, setReview] = useState<{ claim: ClaimRow; reject: boolean } | null>(null)
  const [deleting, setDeleting] = useState<ClaimRow | null>(null)

  const filters = { status: statusFilter, employeeId: "", category: categoryFilter, q, page }
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: expenseKeys.claims(filters),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), q })
      if (statusFilter) params.set("status", statusFilter)
      if (categoryFilter) params.set("category", categoryFilter)
      return apiFetch<ClaimsData>(`${EXPENSE_ENDPOINTS.claims}?${params.toString()}`)
    },
    placeholderData: (prev) => prev,
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = q !== "" || statusFilter !== "" || categoryFilter !== ""
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      {/* Filter row: status select + category select + search */}
      <ClaimsFilters
        status={statusFilter}
        onStatus={(v) => {
          setStatusFilter(v)
          setPage(1)
        }}
        category={categoryFilter}
        onCategory={(v) => {
          setCategoryFilter(v)
          setPage(1)
        }}
        q={qInput}
        onQ={(v) => {
          setQInput(v)
          setPage(1)
        }}
      />

      {/* Result summary */}
      <p className="text-sm text-muted-foreground">
        {data ? t("portal.expense.claims.total", { n: formatNumber(total, lang) }) : " "}
      </p>

      {/* List */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
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
          icon={Receipt}
          title={hasFilters ? t("portal.expense.claims.noResults") : t("portal.expense.claims.noClaims")}
          description={
            hasFilters ? t("portal.expense.claims.noResultsDesc") : t("portal.expense.claims.noClaimsDesc")
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQInput("")
                  setStatusFilter("")
                  setCategoryFilter("")
                  setPage(1)
                }}
              >
                {t("portal.expense.claims.clearFilters")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div
          key={`${page}-${statusFilter}-${categoryFilter}-${q}`}
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {items.map((claim) => (
            <motion.div key={claim.id} variants={itemVariants}>
              <ClaimCard
                claim={claim}
                busy={busyId === claim.id}
                onReview={() => setReview({ claim, reject: false })}
                onDelete={() => setDeleting(claim)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {total > 0 && data && (
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("portal.expense.claims.showing")} {formatNumber((data.page - 1) * PAGE_SIZE + 1, lang)}–
            {formatNumber(Math.min(data.page * PAGE_SIZE, total), lang)} {t("portal.expense.claims.of")}{" "}
            {formatNumber(total, lang)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t("portal.expense.claims.prev")}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              {t("portal.expense.claims.page")} {formatNumber(page, lang)}/{formatNumber(totalPages, lang)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t("portal.expense.claims.next")}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* Review dialog */}
      {review && (
        <ClaimReviewDialog
          key={`${review.claim.id}-${review.reject}`}
          open
          onOpenChange={(o) => {
            if (!o) setReview(null)
          }}
          claim={review.claim}
          busy={reviewMutation.isPending}
          presetReject={review.reject}
          onAction={(action, note) => {
            reviewMutation.mutate(
              { id: review.claim.id, action, note },
              { onSuccess: () => setReview(null) },
            )
          }}
        />
      )}

      {/* Delete confirm (submitted only) */}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null)
        }}
        title={t("portal.expense.review.deleteTitle")}
        description={t("portal.expense.review.deleteDesc", { title: deleting?.title ?? "" })}
        confirmLabel={t("portal.expense.actions.delete")}
        cancelLabel={t("portal.common.cancel")}
        destructive
        onConfirm={() => {
          if (deleting) {
            deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
          }
        }}
      />
    </div>
  )
}
