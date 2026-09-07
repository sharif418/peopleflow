"use client"

// Job postings tab — status chips, search, department filter, job cards with
// close/reopen/hold, edit dialog and guarded delete.
import { useDeferredValue, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Briefcase, Search, X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import type { HrRow } from "@/components/portal/types"
import { JOB_STATUS_VALUES, RECRUITMENT_ENDPOINTS, recruitmentKeys, type JobPostingRow, type JobsData } from "./types"
import { recruitmentErrorMessage } from "./utils"
import { JobCard } from "./job-card"
import { JobFormDialog } from "./job-form-dialog"

const STATUS_TOAST: Record<string, string> = {
  closed: "portal.recruitment.toasts.jobClosed",
  open: "portal.recruitment.toasts.jobReopened",
  on_hold: "portal.recruitment.toasts.jobOnHold",
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
}

export function JobsTab({
  departments,
  onSeeApplications,
  onCreateJob,
}: {
  departments: HrRow[]
  onSeeApplications: (jobId: string) => void
  onCreateJob: () => void
}) {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState("")
  const [qInput, setQInput] = useState("")
  const q = useDeferredValue(qInput)
  const [departmentFilter, setDepartmentFilter] = useState("")
  const [editing, setEditing] = useState<JobPostingRow | null>(null)
  const [deleting, setDeleting] = useState<JobPostingRow | null>(null)

  const filters = { status: statusFilter, q, departmentId: departmentFilter }
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: recruitmentKeys.jobs(filters),
    queryFn: () => {
      const params = new URLSearchParams({ q })
      if (statusFilter) params.set("status", statusFilter)
      if (departmentFilter) params.set("departmentId", departmentFilter)
      return apiFetch<JobsData>(`${RECRUITMENT_ENDPOINTS.jobs}?${params.toString()}`)
    },
    placeholderData: (prev) => prev,
  })

  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: string }) =>
      apiFetch(RECRUITMENT_ENDPOINTS.jobItem(vars.id), {
        method: "PATCH",
        body: JSON.stringify({ status: vars.status }),
      }),
    onSuccess: (_d, vars) => {
      toast.success(t(STATUS_TOAST[vars.status] ?? "portal.recruitment.toasts.jobUpdated"))
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
    onError: (err: Error) => {
      const mapped = recruitmentErrorMessage(err, t)
      toast.error(mapped ?? t("portal.recruitment.toasts.failed"))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(RECRUITMENT_ENDPOINTS.jobItem(id), { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("portal.recruitment.toasts.jobDeleted"))
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
    onError: (err: Error) => {
      const mapped = recruitmentErrorMessage(err, t)
      toast.error(mapped ?? t("portal.recruitment.toasts.failed"))
    },
  })

  const total = data?.items.length ?? 0
  const hasFilters = q !== "" || statusFilter !== "" || departmentFilter !== ""
  const items = data?.items ?? []
  const busyId = statusMutation.isPending || deleteMutation.isPending
    ? (statusMutation.variables?.id ?? deleteMutation.variables)
    : undefined

  const chips: { value: string; key: string }[] = [
    { value: "", key: "portal.recruitment.jobs.filterAll" },
    ...JOB_STATUS_VALUES.map((s) => ({ value: s, key: `portal.recruitment.jobStatus.${s}` })),
  ]

  return (
    <div className="space-y-4">
      {/* Status chips + search + department filter */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("portal.common.status")}>
          {chips.map((chip) => (
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
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder={t("portal.recruitment.jobs.searchPlaceholder")}
              className="h-10 pl-9"
              aria-label={t("portal.recruitment.jobs.searchPlaceholder")}
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
          <Select value={departmentFilter || "all"} onValueChange={(v) => setDepartmentFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-10 w-full sm:w-56" aria-label={t("portal.common.department")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all" className="min-h-10">
                {t("portal.recruitment.jobs.departmentAll")}
              </SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id} className="min-h-10">
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Result summary */}
      <p className="text-sm text-muted-foreground">
        {data ? t("portal.recruitment.jobs.total", { n: formatNumber(total, lang) }) : " "}
      </p>

      {/* List */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
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
          icon={Briefcase}
          title={hasFilters ? t("portal.recruitment.jobs.noResults") : t("portal.recruitment.jobs.noJobs")}
          description={
            hasFilters ? t("portal.recruitment.jobs.noResultsDesc") : t("portal.recruitment.jobs.noJobsDesc")
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQInput("")
                  setStatusFilter("")
                  setDepartmentFilter("")
                }}
              >
                {t("portal.recruitment.jobs.clearFilters")}
              </Button>
            ) : (
              <Button onClick={onCreateJob}>
                {t("portal.recruitment.newJob")}
              </Button>
            )
          }
        />
      ) : (
        <div className="max-h-[34rem] space-y-3 overflow-y-auto pf-scrollbar pr-1">
          <motion.div
            key={`${statusFilter}-${q}-${departmentFilter}`}
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {items.map((job) => (
              <motion.div key={job.id} variants={itemVariants}>
                <JobCard
                  job={job}
                  busy={busyId === job.id}
                  onEdit={() => setEditing(job)}
                  onDelete={() => setDeleting(job)}
                  onStatus={(status) => statusMutation.mutate({ id: job.id, status })}
                  onSeeApplications={() => onSeeApplications(job.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Edit dialog */}
      {editing && (
        <JobFormDialog
          key={editing.id}
          open
          onOpenChange={(o) => {
            if (!o) setEditing(null)
          }}
          job={editing}
          departments={departments}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null)
        }}
        title={t("portal.recruitment.jobs.deleteTitle")}
        description={t("portal.recruitment.jobs.deleteDesc", { title: deleting?.title ?? "" })}
        confirmLabel={t("portal.recruitment.jobs.delete")}
        cancelLabel={t("portal.common.cancel")}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
      />
    </div>
  )
}
