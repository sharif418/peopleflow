"use client"

// Applications pipeline tab — filters, pagination, candidate cards with
// optimistic stage advance / reject + detail dialog.
import { useDeferredValue, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  NEXT_STAGE,
  RECRUITMENT_ENDPOINTS,
  recruitmentKeys,
  type ApplicationDetail,
  type ApplicationsData,
  type JobApplicationRow,
  type JobPostingRow,
} from "./types"
import { recruitmentErrorMessage, stageLabel } from "./utils"
import { ApplicationCard } from "./application-card"
import { ApplicationFilters } from "./application-filters"
import { ApplicationDetailDialog } from "./application-detail-dialog"
import { CreateApplicationDialog } from "./create-application-dialog"

const PAGE_SIZE = 12

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
}

export function ApplicationsTab({
  jobFilter,
  onJobFilterChange,
  jobs,
}: {
  jobFilter: string
  onJobFilterChange: (jobId: string) => void
  jobs: JobPostingRow[]
}) {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()

  const [stageFilter, setStageFilter] = useState("")
  const [qInput, setQInput] = useState("")
  const q = useDeferredValue(qInput)
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<JobApplicationRow | null>(null)
  const [rejecting, setRejecting] = useState<JobApplicationRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Reset page when the parent switches the job filter (e.g. from a job card).
  // Render-phase adjust pattern (guarded by prev state) so it never loops.
  const [prevJobFilter, setPrevJobFilter] = useState(jobFilter)
  if (prevJobFilter !== jobFilter) {
    setPrevJobFilter(jobFilter)
    setPage(1)
  }

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: recruitmentKeys.applications({ stage: stageFilter, jobPostingId: jobFilter, q, page }),
    queryFn: () => {
      const params = new URLSearchParams({ q, page: String(page) })
      if (stageFilter) params.set("stage", stageFilter)
      if (jobFilter) params.set("jobPostingId", jobFilter)
      return apiFetch<ApplicationsData>(`${RECRUITMENT_ENDPOINTS.applications}?${params.toString()}`)
    },
    placeholderData: (prev) => prev,
  })

  // Optimistic stage change (advance / reject) across all cached pages.
  const stageMutation = useMutation({
    mutationFn: (vars: { id: string; stage: string }) =>
      apiFetch<ApplicationDetail>(RECRUITMENT_ENDPOINTS.applicationItem(vars.id), {
        method: "PATCH",
        body: JSON.stringify({ stage: vars.stage }),
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: recruitmentKeys.all })
      const snapshots = queryClient.getQueriesData<ApplicationsData>({
        queryKey: ["org", "recruitment", "applications"],
      })
      for (const [key, snapshot] of snapshots) {
        if (!snapshot) continue
        queryClient.setQueryData<ApplicationsData>(key, {
          ...snapshot,
          items: snapshot.items.map((a) => (a.id === vars.id ? { ...a, stage: vars.stage } : a)),
        })
      }
      return { snapshots }
    },
    onError: (err: Error, _vars, ctx) => {
      const mapped = recruitmentErrorMessage(err, t)
      toast.error(mapped ?? t("portal.recruitment.toasts.failed"))
      if (ctx?.snapshots) {
        for (const [key, snapshot] of ctx.snapshots) queryClient.setQueryData(key, snapshot)
      }
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.stage === "rejected"
          ? t("portal.recruitment.toasts.applicationRejected")
          : t("portal.recruitment.toasts.stageAdvanced", { stage: stageLabel(vars.stage, t) }),
      )
      setRejecting(null)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = q !== "" || stageFilter !== "" || jobFilter !== ""
  const items = data?.items ?? []
  const busyId = stageMutation.isPending ? stageMutation.variables?.id : undefined

  return (
    <div className="space-y-4">
      {/* Filters */}
      <ApplicationFilters
        stageFilter={stageFilter}
        onStageChange={(stage) => {
          setStageFilter(stage)
          setPage(1)
        }}
        qInput={qInput}
        onQChange={(value) => {
          setQInput(value)
          setPage(1)
        }}
        jobFilter={jobFilter}
        onJobFilterChange={onJobFilterChange}
        jobs={jobs}
        onCreate={() => setCreateOpen(true)}
      />

      {/* Result summary */}
      <p className="text-sm text-muted-foreground">
        {data ? t("portal.recruitment.applications.total", { n: formatNumber(total, lang) }) : " "}
      </p>

      {/* List */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
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
          title={
            hasFilters
              ? t("portal.recruitment.applications.noResults")
              : t("portal.recruitment.applications.noApplications")
          }
          description={
            hasFilters
              ? t("portal.recruitment.applications.noResultsDesc")
              : t("portal.recruitment.applications.noApplicationsDesc")
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQInput("")
                  setStageFilter("")
                  onJobFilterChange("")
                  setPage(1)
                }}
              >
                {t("portal.recruitment.applications.clearFilters")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div
          key={`${page}-${stageFilter}-${q}-${jobFilter}`}
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {items.map((app) => (
            <motion.div key={app.id} variants={itemVariants}>
              <ApplicationCard
                application={app}
                busy={busyId === app.id}
                onAdvance={() => {
                  const next = NEXT_STAGE[app.stage]
                  if (next) stageMutation.mutate({ id: app.id, stage: next })
                }}
                onReject={() => setRejecting(app)}
                onOpen={() => setDetail(app)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {total > 0 && data && (
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("portal.recruitment.applications.showing")} {formatNumber((data.page - 1) * PAGE_SIZE + 1, lang)}–
            {formatNumber(Math.min(data.page * PAGE_SIZE, total), lang)} {t("portal.recruitment.applications.of")}{" "}
            {formatNumber(total, lang)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t("portal.recruitment.applications.prev")}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              {t("portal.recruitment.applications.page")} {formatNumber(page, lang)}/{formatNumber(totalPages, lang)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t("portal.recruitment.applications.next")}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      {detail && (
        <ApplicationDetailDialog
          key={detail.id}
          applicationId={detail.id}
          onOpenChange={(o) => {
            if (!o) setDetail(null)
          }}
        />
      )}

      {/* Reject confirm */}
      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(o) => {
          if (!o) setRejecting(null)
        }}
        title={t("portal.recruitment.detail.rejectTitle")}
        description={t("portal.recruitment.detail.rejectDesc", { name: rejecting?.candidateName ?? "" })}
        confirmLabel={t("portal.recruitment.detail.confirmReject")}
        cancelLabel={t("portal.common.cancel")}
        destructive
        onConfirm={() => {
          if (rejecting) stageMutation.mutate({ id: rejecting.id, stage: "rejected" })
        }}
      />

      {/* Create application dialog */}
      <CreateApplicationDialog open={createOpen} onOpenChange={setCreateOpen} jobs={jobs} />
    </div>
  )
}
