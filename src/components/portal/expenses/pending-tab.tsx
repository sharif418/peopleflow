"use client"

// Pending review inbox — summary cards (count / total ৳ / largest claim),
// submitted claims with quick-approve + reject/review dialog, pagination.
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { BadgeCheck, ChevronLeft, ChevronRight, Coins, Hourglass, TrendingUp } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatBdt, formatNumber } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import {
  EXPENSE_ENDPOINTS,
  expenseKeys,
  type ClaimRow,
  type ClaimsData,
} from "./types"
import { useClaimActions } from "./use-claim-actions"
import { ClaimCard } from "./claim-card"
import { ClaimReviewDialog } from "./claim-review-dialog"

const PAGE_SIZE = 12

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
}

function MiniCard({
  title,
  value,
  icon: Icon,
  iconClassName,
}: {
  title: string
  value: string
  icon: typeof Hourglass
  iconClassName?: string
}) {
  return (
    <Card className="border-border/80 bg-card shadow-xs">
      <CardContent className="flex items-center justify-between gap-2 p-3.5 sm:p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
          <p className="pf-money mt-1 truncate text-lg font-semibold tabular-nums sm:text-xl">{value}</p>
        </div>
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconClassName ?? "bg-primary/10 text-primary"}`}>
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}

export function PendingTab() {
  const { lang, t } = useI18n()
  const { reviewMutation, busyId } = useClaimActions()
  const [page, setPage] = useState(1)
  const [review, setReview] = useState<{ claim: ClaimRow; reject: boolean } | null>(null)

  const filters = { status: "submitted", employeeId: "", category: "", q: "", page }
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: expenseKeys.claims(filters),
    queryFn: () =>
      apiFetch<ClaimsData>(
        `${EXPENSE_ENDPOINTS.claims}?${new URLSearchParams({ status: "submitted", page: String(page) }).toString()}`,
      ),
    placeholderData: (prev) => prev,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const largest = items.reduce((max, c) => Math.max(max, c.totalAmount), 0)

  return (
    <div className="space-y-4">
      {/* Pending summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {isPending ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          <>
            <MiniCard
              title={t("portal.expense.pending.countCard")}
              value={formatNumber(data?.summary.pending ?? total, lang)}
              icon={Hourglass}
              iconClassName="bg-warning/15 text-warning animate-pulse"
            />
            <MiniCard
              title={t("portal.expense.pending.amountCard")}
              value={formatBdt(data?.summary.pendingAmount ?? 0, lang)}
              icon={Coins}
              iconClassName="bg-primary/10 text-primary"
            />
            <MiniCard
              title={t("portal.expense.pending.largestCard")}
              value={formatBdt(largest, lang)}
              icon={TrendingUp}
              iconClassName="bg-success/15 text-success"
            />
          </>
        )}
      </div>

      {/* Inbox */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
          icon={BadgeCheck}
          title={t("portal.expense.pending.emptyTitle")}
          description={t("portal.expense.pending.emptyDesc")}
        />
      ) : (
        <motion.div
          key={page}
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
                onQuickApprove={() => reviewMutation.mutate({ id: claim.id, action: "approve", note: null })}
                onReject={() => setReview({ claim, reject: true })}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && data && (
        <div className="flex items-center justify-center gap-1">
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
      )}

      {/* Review / reject dialog */}
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
    </div>
  )
}
