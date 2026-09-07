"use client"

// Goals tab — filter chips, search, new-goal button, goal cards with
// progress update / complete / cancel / delete + confirm dialogs.
import { useDeferredValue, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Flag, Plus, Search, X } from "lucide-react"
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
  PERFORMANCE_ENDPOINTS,
  performanceKeys,
  type GoalRow,
  type GoalsData,
} from "./types"
import { performanceErrorMessage } from "./utils"
import { GoalCard } from "./goal-card"
import { GoalFormDialog } from "./goal-form-dialog"
import { GoalProgressDialog } from "./goal-progress-dialog"

const CHIPS = [
  { value: "", key: "portal.performance.goalFilter.all" },
  { value: "active", key: "portal.performance.goalFilter.active" },
  { value: "completed", key: "portal.performance.goalFilter.completed" },
  { value: "overdue", key: "portal.performance.goalFilter.overdue" },
  { value: "cancelled", key: "portal.performance.goalFilter.cancelled" },
] as const

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
}

export function GoalsTab() {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState("")
  const [qInput, setQInput] = useState("")
  const q = useDeferredValue(qInput)
  const [createOpen, setCreateOpen] = useState(false)
  const [progressGoal, setProgressGoal] = useState<GoalRow | null>(null)
  const [cancelGoal, setCancelGoal] = useState<GoalRow | null>(null)
  const [deleteGoal, setDeleteGoal] = useState<GoalRow | null>(null)

  const filters = { status: statusFilter, employeeId: "", q }
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: performanceKeys.goals(filters),
    queryFn: () => {
      const params = new URLSearchParams({ q })
      if (statusFilter) params.set("status", statusFilter)
      return apiFetch<GoalsData>(`${PERFORMANCE_ENDPOINTS.goals}?${params.toString()}`)
    },
    placeholderData: (prev) => prev,
  })

  // Progress update (PATCH currentValue) — the server may auto-complete.
  const progressMutation = useMutation({
    mutationFn: (vars: { id: string; currentValue: number }) =>
      apiFetch<GoalRow>(PERFORMANCE_ENDPOINTS.goalItem(vars.id), {
        method: "PATCH",
        body: JSON.stringify({ currentValue: vars.currentValue }),
      }),
    onError: (err: Error) => {
      const mapped = performanceErrorMessage(err, t)
      toast.error(mapped ?? t("portal.performance.toasts.failed"))
    },
    onSuccess: (row) => {
      toast.success(
        row.autoCompleted
          ? t("portal.performance.toasts.goalAutoCompleted")
          : t("portal.performance.toasts.goalProgressUpdated"),
      )
      setProgressGoal(null)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: performanceKeys.all })
    },
  })

  // Status transition (PATCH status: completed | cancelled).
  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: "completed" | "cancelled" }) =>
      apiFetch<GoalRow>(PERFORMANCE_ENDPOINTS.goalItem(vars.id), {
        method: "PATCH",
        body: JSON.stringify({ status: vars.status }),
      }),
    onError: (err: Error) => {
      const mapped = performanceErrorMessage(err, t)
      toast.error(mapped ?? t("portal.performance.toasts.failed"))
    },
    onSuccess: (_row, vars) => {
      toast.success(
        vars.status === "completed"
          ? t("portal.performance.toasts.goalCompleted")
          : t("portal.performance.toasts.goalCancelled"),
      )
      setCancelGoal(null)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: performanceKeys.all })
    },
  })

  // Delete an active goal.
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch<{ id: string }>(PERFORMANCE_ENDPOINTS.goalItem(id), { method: "DELETE" }),
    onError: (err: Error) => {
      const mapped = performanceErrorMessage(err, t)
      toast.error(mapped ?? t("portal.performance.toasts.failed"))
    },
    onSuccess: () => {
      toast.success(t("portal.performance.toasts.goalDeleted"))
      setDeleteGoal(null)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: performanceKeys.all })
    },
  })

  const total = data?.total ?? 0
  const items = data?.items ?? []
  const hasFilters = q !== "" || statusFilter !== ""
  const busyId = progressMutation.isPending
    ? progressMutation.variables?.id
    : statusMutation.isPending
      ? statusMutation.variables?.id
      : deleteMutation.isPending
        ? deleteMutation.variables
        : undefined

  return (
    <div className="space-y-4">
      {/* Filter chips + search + create */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("portal.common.status")}>
          {CHIPS.map((chip) => (
            <button
              type="button"
              key={chip.value || "all"}
              onClick={() => setStatusFilter(chip.value)}
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
              onChange={(e) => setQInput(e.target.value)}
              placeholder={t("portal.performance.goals.searchPlaceholder")}
              className="h-10 pl-9"
              aria-label={t("portal.performance.goals.searchPlaceholder")}
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
            <span className="hidden sm:inline">{t("portal.performance.newGoal")}</span>
          </Button>
        </div>
      </div>

      {/* Result summary */}
      <p className="text-sm text-muted-foreground">
        {data ? t("portal.performance.goals.total", { n: formatNumber(total, lang) }) : " "}
      </p>

      {/* List */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
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
          icon={Flag}
          title={hasFilters ? t("portal.performance.goals.noResults") : t("portal.performance.goals.noGoals")}
          description={
            hasFilters
              ? t("portal.performance.goals.noResultsDesc")
              : t("portal.performance.goals.noGoalsDesc")
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQInput("")
                  setStatusFilter("")
                }}
              >
                {t("portal.performance.goals.clearFilters")}
              </Button>
            ) : (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden />
                {t("portal.performance.newGoal")}
              </Button>
            )
          }
        />
      ) : (
        <div className="max-h-[46rem] space-y-3 overflow-y-auto pf-scrollbar pr-1">
          <motion.div
            key={`${statusFilter}-${q}`}
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {items.map((g) => (
              <motion.div key={g.id} variants={itemVariants}>
                <GoalCard
                  goal={g}
                  busy={busyId === g.id}
                  onUpdateProgress={() => setProgressGoal(g)}
                  onComplete={() =>
                    statusMutation.mutate({ id: g.id, status: "completed" })
                  }
                  onCancel={() => setCancelGoal(g)}
                  onDelete={() => setDeleteGoal(g)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Dialogs */}
      <GoalFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {progressGoal && (
        <GoalProgressDialog
          key={`${progressGoal.id}-${progressGoal.currentValue}`}
          open
          onOpenChange={(o) => {
            if (!o) setProgressGoal(null)
          }}
          goal={progressGoal}
          busy={progressMutation.isPending}
          onSubmit={(currentValue) => progressMutation.mutate({ id: progressGoal.id, currentValue })}
        />
      )}

      <ConfirmDialog
        open={cancelGoal !== null}
        onOpenChange={(o) => {
          if (!o) setCancelGoal(null)
        }}
        title={t("portal.performance.goalActions.cancelTitle")}
        description={t("portal.performance.goalActions.cancelDesc", { title: cancelGoal?.title ?? "" })}
        confirmLabel={t("portal.performance.goalActions.confirmCancel")}
        cancelLabel={t("portal.common.cancel")}
        destructive={false}
        onConfirm={() => {
          if (cancelGoal) statusMutation.mutate({ id: cancelGoal.id, status: "cancelled" })
        }}
      />

      <ConfirmDialog
        open={deleteGoal !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteGoal(null)
        }}
        title={t("portal.performance.goalActions.deleteTitle")}
        description={t("portal.performance.goalActions.deleteDesc", { title: deleteGoal?.title ?? "" })}
        confirmLabel={t("portal.performance.goalActions.confirmDelete")}
        cancelLabel={t("portal.common.cancel")}
        destructive
        onConfirm={() => {
          if (deleteGoal) deleteMutation.mutate(deleteGoal.id)
        }}
      />
    </div>
  )
}
