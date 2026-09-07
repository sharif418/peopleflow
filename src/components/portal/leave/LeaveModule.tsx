"use client"

// Leave module shell — stats row + tabs (requests / types / balances).
// Default export: wired into the portal nav by the main agent.
import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { BadgeCheck, CalendarDays, Hourglass, ListChecks, Plus, Sun } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import {
  DEFAULT_REQUEST_FILTERS,
  LEAVE_ENDPOINTS,
  leaveKeys,
  type LeaveRequestsData,
  type LeaveTypeRow,
  type LeaveTypesData,
} from "./types"
import { hueFor, type LeaveHue } from "./utils"
import { RequestsTab } from "./requests-tab"
import { TypesTab } from "./types-tab"
import { BalancesTab } from "./balances-tab"
import { CreateRequestDialog } from "./create-request-dialog"

type LeaveTab = "requests" | "types" | "balances"

const TAB_VALUES: { value: LeaveTab; key: string }[] = [
  { value: "requests", key: "portal.leave.tabs.requests" },
  { value: "types", key: "portal.leave.tabs.types" },
  { value: "balances", key: "portal.leave.tabs.balances" },
]

export default function LeaveModule() {
  const { lang, t } = useI18n()
  const [tab, setTab] = useState<LeaveTab>("requests")
  const [createOpen, setCreateOpen] = useState(false)

  // Base requests query (default filters) — drives the stats row and shares
  // its cache entry with the requests tab's initial state.
  const summaryQuery = useQuery({
    queryKey: leaveKeys.requests(DEFAULT_REQUEST_FILTERS),
    queryFn: () =>
      apiFetch<LeaveRequestsData>(`${LEAVE_ENDPOINTS.requests}?page=1&status=&q=&employeeId=`),
    staleTime: 15_000,
  })

  const typesQuery = useQuery({
    queryKey: leaveKeys.types,
    queryFn: () => apiFetch<LeaveTypesData>(LEAVE_ENDPOINTS.types),
    staleTime: 60_000,
  })

  // Stable hue per leave type id (position in the org's type list).
  const hueOf = useMemo(() => {
    const map = new Map<string, LeaveHue>()
    for (const [i, item] of (typesQuery.data?.items ?? []).entries()) map.set(item.id, hueFor(i))
    return (typeId: string): LeaveHue | null => map.get(typeId) ?? null
  }, [typesQuery.data])

  const summary = summaryQuery.data?.summary
  const types: LeaveTypeRow[] = typesQuery.data?.items ?? []

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("portal.leave.title")}
        subtitle={t("portal.leave.subtitle")}
        icon={CalendarDays}
        actions={
          <Button className="h-10" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("portal.leave.newRequest")}
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
              title={t("portal.leave.stats.pending")}
              value={formatNumber(summary?.pending ?? 0, lang)}
              icon={Hourglass}
              iconClassName="bg-warning/15 text-warning animate-pulse"
            />
            <StatCard
              title={t("portal.leave.stats.onLeaveToday")}
              value={formatNumber(summary?.onLeaveToday ?? 0, lang)}
              icon={Sun}
              iconClassName="bg-success/15 text-success"
            />
            <StatCard
              title={t("portal.leave.stats.approvedMonth")}
              value={formatNumber(summary?.approvedMonth ?? 0, lang)}
              icon={BadgeCheck}
            />
            <StatCard
              title={t("portal.leave.stats.totalTypes")}
              value={formatNumber(summary?.totalTypes ?? types.length, lang)}
              icon={ListChecks}
              iconClassName="bg-muted text-muted-foreground"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as LeaveTab)}>
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
          {tab === "requests" && <RequestsTab hueOf={hueOf} />}
          {tab === "types" && <TypesTab />}
          {tab === "balances" && <BalancesTab />}
        </motion.div>
      </AnimatePresence>

      <CreateRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        types={types}
        typesLoading={typesQuery.isPending}
      />
    </div>
  )
}
