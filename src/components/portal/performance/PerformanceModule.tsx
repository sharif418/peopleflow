"use client"

// Performance module shell — stats row + tabs (goals / appraisals).
// Default export: wired into the portal nav by the CTO (feature key "performance").
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ClipboardCheck, Flag, Star, Target, TrendingUp, Trophy } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import {
  DEFAULT_APPRAISAL_FILTERS,
  DEFAULT_GOAL_FILTERS,
  PERFORMANCE_ENDPOINTS,
  performanceKeys,
  type AppraisalsData,
  type GoalsData,
} from "./types"
import { GoalsTab } from "./goals-tab"
import { AppraisalsTab } from "./appraisals-tab"

type PerformanceTab = "goals" | "appraisals"

const TAB_VALUES: { value: PerformanceTab; key: string }[] = [
  { value: "goals", key: "portal.performance.tabs.goals" },
  { value: "appraisals", key: "portal.performance.tabs.appraisals" },
]

export default function PerformanceModule() {
  const { lang, t } = useI18n()
  const [tab, setTab] = useState<PerformanceTab>("goals")

  // Base queries (default filters) — drive the stats row and share their cache
  // entries with the tabs' initial states.
  const goalsQuery = useQuery({
    queryKey: performanceKeys.goals(DEFAULT_GOAL_FILTERS),
    queryFn: () =>
      apiFetch<GoalsData>(
        `${PERFORMANCE_ENDPOINTS.goals}?status=&employeeId=&q=${encodeURIComponent("")}`,
      ),
    staleTime: 15_000,
  })

  const appraisalsQuery = useQuery({
    queryKey: performanceKeys.appraisals(DEFAULT_APPRAISAL_FILTERS),
    queryFn: () =>
      apiFetch<AppraisalsData>(
        `${PERFORMANCE_ENDPOINTS.appraisals}?status=&employeeId=&q=&page=1`,
      ),
    staleTime: 15_000,
  })

  const goalsSummary = goalsQuery.data?.summary
  const appraisalSummary = appraisalsQuery.data?.summary
  const statsPending = tab === "goals" ? goalsQuery.isPending : appraisalsQuery.isPending

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("portal.performance.title")}
        subtitle={t("portal.performance.subtitle")}
        icon={Target}
      />

      {/* Stats row (switches with the active tab) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        {statsPending ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : tab === "goals" ? (
          <>
            <StatCard
              title={t("portal.performance.stats.activeGoals")}
              value={formatNumber(goalsSummary?.active ?? 0, lang)}
              icon={Flag}
              iconClassName="bg-primary/15 text-primary"
            />
            <StatCard
              title={t("portal.performance.stats.completedGoals")}
              value={formatNumber(goalsSummary?.completed ?? 0, lang)}
              icon={Trophy}
              iconClassName="bg-success/15 text-success"
            />
            <StatCard
              title={t("portal.performance.stats.overdueGoals")}
              value={formatNumber(goalsSummary?.overdue ?? 0, lang)}
              icon={AlertTriangle}
              iconClassName="bg-destructive/15 text-destructive animate-pulse"
            />
            <StatCard
              title={t("portal.performance.stats.avgProgress")}
              value={`${formatNumber(goalsSummary?.avgProgressPercent ?? 0, lang)}%`}
              icon={TrendingUp}
              iconClassName="bg-warning/15 text-warning"
            />
          </>
        ) : (
          <>
            <StatCard
              title={t("portal.performance.stats.draftAppraisals")}
              value={formatNumber(appraisalSummary?.draft ?? 0, lang)}
              icon={ClipboardCheck}
              iconClassName="bg-muted text-muted-foreground"
            />
            <StatCard
              title={t("portal.performance.stats.inReviewAppraisals")}
              value={formatNumber(appraisalSummary?.inReview ?? 0, lang)}
              icon={ClipboardCheck}
              iconClassName="bg-warning/15 text-warning animate-pulse"
            />
            <StatCard
              title={t("portal.performance.stats.finalAppraisals")}
              value={formatNumber(appraisalSummary?.final ?? 0, lang)}
              icon={Trophy}
              iconClassName="bg-success/15 text-success"
            />
            <StatCard
              title={t("portal.performance.stats.avgFinalScore")}
              value={formatNumber(appraisalSummary?.avgFinalScore ?? 0, lang)}
              icon={Star}
              iconClassName="bg-primary/15 text-primary"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as PerformanceTab)}>
        <TabsList className="h-11 w-full max-w-md sm:w-auto">
          {TAB_VALUES.map((tb) => (
            <TabsTrigger key={tb.value} value={tb.value} className="min-h-9 flex-1 px-4 sm:px-6">
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
          {tab === "goals" && <GoalsTab />}
          {tab === "appraisals" && <AppraisalsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
