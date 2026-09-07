"use client"

// Recruitment module shell — stats row + tabs (jobs / applications).
// Default export: wired into the portal nav by the CTO.
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { BadgeCheck, Briefcase, CalendarClock, Plus, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { HR_ENDPOINTS, orgKeys } from "@/components/portal/api"
import type { HrRow } from "@/components/portal/types"
import {
  DEFAULT_APPLICATION_FILTERS,
  DEFAULT_JOBS_FILTERS,
  RECRUITMENT_ENDPOINTS,
  recruitmentKeys,
  type ApplicationsData,
  type JobsData,
} from "./types"
import { JobsTab } from "./jobs-tab"
import { ApplicationsTab } from "./applications-tab"
import { JobFormDialog } from "./job-form-dialog"

type RecruitmentTab = "jobs" | "applications"

const TAB_VALUES: { value: RecruitmentTab; key: string }[] = [
  { value: "jobs", key: "portal.recruitment.tabs.jobs" },
  { value: "applications", key: "portal.recruitment.tabs.applications" },
]

export default function RecruitmentModule() {
  const { lang, t } = useI18n()
  const [tab, setTab] = useState<RecruitmentTab>("jobs")
  const [createJobOpen, setCreateJobOpen] = useState(false)
  const [jobFilter, setJobFilter] = useState("")

  // Base applications query (default filters) — drives the stats row and shares
  // its cache entry with the applications tab's initial state.
  const summaryQuery = useQuery({
    queryKey: recruitmentKeys.applications(DEFAULT_APPLICATION_FILTERS),
    queryFn: () =>
      apiFetch<ApplicationsData>(`${RECRUITMENT_ENDPOINTS.applications}?stage=&q=&jobPostingId=&page=1`),
    staleTime: 15_000,
  })

  // Unfiltered jobs list — feeds the applications-tab job filter + create dialogs.
  const jobsQuery = useQuery({
    queryKey: recruitmentKeys.jobs(DEFAULT_JOBS_FILTERS),
    queryFn: () => apiFetch<JobsData>(`${RECRUITMENT_ENDPOINTS.jobs}?status=&q=&departmentId=`),
    staleTime: 30_000,
  })

  const departmentsQuery = useQuery({
    queryKey: orgKeys.hr("departments"),
    queryFn: () => apiFetch<HrRow[]>(HR_ENDPOINTS.departments),
    staleTime: 60_000,
  })

  const summary = summaryQuery.data?.summary

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("portal.recruitment.title")}
        subtitle={t("portal.recruitment.subtitle")}
        icon={Briefcase}
        actions={
          <Button className="h-10" onClick={() => setCreateJobOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("portal.recruitment.newJob")}
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        {summaryQuery.isPending ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard
              title={t("portal.recruitment.stats.openJobs")}
              value={formatNumber(summary?.openJobs ?? 0, lang)}
              icon={Briefcase}
              iconClassName="bg-success/15 text-success"
            />
            <StatCard
              title={t("portal.recruitment.stats.activePipeline")}
              value={formatNumber(summary?.activePipeline ?? 0, lang)}
              icon={Users}
              iconClassName="bg-primary/12 text-primary"
            />
            <StatCard
              title={t("portal.recruitment.stats.upcomingInterviews")}
              value={formatNumber(summary?.upcomingInterviews ?? 0, lang)}
              icon={CalendarClock}
              iconClassName="bg-warning/15 text-warning"
            />
            <StatCard
              title={t("portal.recruitment.stats.hired")}
              value={formatNumber(summary?.hired ?? 0, lang)}
              icon={BadgeCheck}
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as RecruitmentTab)}>
        <TabsList className="h-11 w-full max-w-md sm:w-auto">
          {TAB_VALUES.map((tb) => (
            <TabsTrigger key={tb.value} value={tb.value} className="min-h-9 flex-1 px-3 sm:px-4">
              {t(tb.key)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Tab content (fade transition) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          {tab === "jobs" && (
            <JobsTab
              departments={departmentsQuery.data ?? []}
              onSeeApplications={(jobId) => {
                setJobFilter(jobId)
                setTab("applications")
              }}
              onCreateJob={() => setCreateJobOpen(true)}
            />
          )}
          {tab === "applications" && (
            <ApplicationsTab
              jobFilter={jobFilter}
              onJobFilterChange={setJobFilter}
              jobs={jobsQuery.data?.items ?? []}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Create posting dialog (module-level) */}
      <JobFormDialog
        open={createJobOpen}
        onOpenChange={setCreateJobOpen}
        job={null}
        departments={departmentsQuery.data ?? []}
      />
    </div>
  )
}
