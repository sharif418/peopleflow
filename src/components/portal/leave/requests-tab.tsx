"use client"

// Requests inbox — filter chips, search, pagination, rich cards,
// approve / reject / cancel with optimistic updates + toasts.
import { useDeferredValue, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Inbox, Search, X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  LEAVE_ENDPOINTS,
  leaveKeys,
  statusesForFilter,
  type LeaveAction,
  type LeaveRequestsData,
  type LeaveRequestRow,
} from "./types"
import { leaveErrorMessage, type LeaveHue } from "./utils"
import { RequestCard } from "./request-card"
import { ReviewDialog } from "./review-dialog"

const PAGE_SIZE = 12
const CHIPS = [
  { value: "", key: "portal.leave.filter.all" },
  { value: "pending", key: "portal.leave.filter.pending" },
  { value: "approved", key: "portal.leave.filter.approved" },
  { value: "closed", key: "portal.leave.filter.closed" },
] as const

const ACTION_STATUS: Record<LeaveAction, string> = {
  approve: "approved",
  reject: "rejected",
  cancel: "cancelled",
}

const TOAST_KEY: Record<LeaveAction, string> = {
  approve: "portal.leave.toasts.approved",
  reject: "portal.leave.toasts.rejected",
  cancel: "portal.leave.toasts.cancelled",
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
}

export function RequestsTab({ hueOf }: { hueOf: (typeId: string) => LeaveHue | null }) {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState("")
  const [qInput, setQInput] = useState("")
  const q = useDeferredValue(qInput)
  const [page, setPage] = useState(1)

  const [review, setReview] = useState<{ request: LeaveRequestRow; action: "approve" | "reject" } | null>(null)
  const [cancelling, setCancelling] = useState<LeaveRequestRow | null>(null)

  const filters = { status: statusFilter, employeeId: "", q, page }
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: leaveKeys.requests(filters),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), q })
      const statuses = statusesForFilter(statusFilter)
      if (statuses) params.set("status", statuses)
      return apiFetch<LeaveRequestsData>(`${LEAVE_ENDPOINTS.requests}?${params.toString()}`)
    },
    placeholderData: (prev) => prev,
  })

  const reviewMutation = useMutation({
    mutationFn: (vars: { id: string; action: LeaveAction; note: string | null }) =>
      apiFetch<LeaveRequestRow>(LEAVE_ENDPOINTS.requestItem(vars.id), {
        method: "PATCH",
        body: JSON.stringify({ action: vars.action, note: vars.note }),
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: leaveKeys.all })
      const snapshots = queryClient.getQueriesData<LeaveRequestsData>({
        queryKey: ["org", "leave", "requests"],
      })
      const target = ACTION_STATUS[vars.action]
      for (const [key, snapshot] of snapshots) {
        if (!snapshot) continue
        queryClient.setQueryData<LeaveRequestsData>(key, {
          ...snapshot,
          items: snapshot.items.map((r) => (r.id === vars.id ? { ...r, status: target } : r)),
        })
      }
      return { snapshots }
    },
    onError: (err: Error, _vars, ctx) => {
      const mapped = leaveErrorMessage(err, t)
      toast.error(mapped ?? t("portal.leave.toasts.failed"))
      if (ctx?.snapshots) {
        for (const [key, snapshot] of ctx.snapshots) queryClient.setQueryData(key, snapshot)
      }
    },
    onSuccess: (_data, vars) => {
      toast.success(t(TOAST_KEY[vars.action]))
      setReview(null)
      setCancelling(null)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: leaveKeys.all })
    },
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = q !== "" || statusFilter !== ""
  const items = data?.items ?? []
  const busyId = reviewMutation.isPending ? reviewMutation.variables?.id : undefined

  return (
    <div className="space-y-4">
      {/* Filter chips + search */}
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={qInput}
            onChange={(e) => {
              setQInput(e.target.value)
              setPage(1)
            }}
            placeholder={t("portal.leave.requests.searchPlaceholder")}
            className="h-10 pl-9"
            aria-label={t("portal.leave.requests.searchPlaceholder")}
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

      {/* Result summary */}
      <p className="text-sm text-muted-foreground">
        {data ? t("portal.leave.requests.total", { n: formatNumber(total, lang) }) : " "}
      </p>

      {/* List */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
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
          icon={Inbox}
          title={hasFilters ? t("portal.leave.requests.noResults") : t("portal.leave.requests.noRequests")}
          description={
            hasFilters ? t("portal.leave.requests.noResultsDesc") : t("portal.leave.requests.noRequestsDesc")
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
                {t("portal.leave.requests.clearFilters")}
              </Button>
            ) : undefined
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
          {items.map((r) => (
            <motion.div key={r.id} variants={itemVariants}>
              <RequestCard
                request={r}
                hue={hueOf(r.leaveType.id)}
                busy={busyId === r.id}
                onApprove={() => setReview({ request: r, action: "approve" })}
                onReject={() => setReview({ request: r, action: "reject" })}
                onCancel={() => setCancelling(r)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {total > 0 && data && (
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("portal.leave.requests.showing")} {formatNumber((data.page - 1) * PAGE_SIZE + 1, lang)}–
            {formatNumber(Math.min(data.page * PAGE_SIZE, total), lang)} {t("portal.leave.requests.of")}{" "}
            {formatNumber(total, lang)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t("portal.leave.requests.prev")}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              {t("portal.leave.requests.page")} {formatNumber(page, lang)}/{formatNumber(totalPages, lang)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t("portal.leave.requests.next")}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* Approve / Reject note dialog */}
      {review && (
        <ReviewDialog
          key={`${review.request.id}-${review.action}`}
          open
          onOpenChange={(o) => {
            if (!o) setReview(null)
          }}
          request={review.request}
          action={review.action}
          hue={hueOf(review.request.leaveType.id)}
          busy={reviewMutation.isPending}
          onSubmit={(note) => {
            reviewMutation.mutate({ id: review.request.id, action: review.action, note: note.trim() || null })
          }}
        />
      )}

      {/* Cancel confirm */}
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(o) => {
          if (!o) setCancelling(null)
        }}
        title={t("portal.leave.review.cancelTitle")}
        description={t("portal.leave.review.cancelDesc", {
          name: cancelling ? `${cancelling.employee.firstName} ${cancelling.employee.lastName}` : "",
          code: cancelling?.employee.employeeCode ?? "",
        })}
        confirmLabel={t("portal.leave.review.confirmCancel")}
        cancelLabel={t("portal.common.cancel")}
        destructive={false}
        onConfirm={() => {
          if (cancelling) {
            reviewMutation.mutate({ id: cancelling.id, action: "cancel", note: null })
          }
        }}
      />
    </div>
  )
}
