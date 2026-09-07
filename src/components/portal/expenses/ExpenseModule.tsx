"use client"

// Expense module shell — stats row + tabs (all claims / pending review inbox
// with count badge). Default export: wired into the portal nav by the CTO.
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { BadgeCheck, Coins, Hourglass, Plus, Receipt } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatBdt, formatNumber } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import {
  DEFAULT_CLAIM_FILTERS,
  EXPENSE_ENDPOINTS,
  expenseKeys,
  type ClaimsData,
} from "./types"
import { ClaimsTab } from "./claims-tab"
import { PendingTab } from "./pending-tab"
import { ClaimFormDialog } from "./claim-form-dialog"

type ExpenseTab = "all" | "pending"

export default function ExpenseModule() {
  const { lang, t } = useI18n()
  const [tab, setTab] = useState<ExpenseTab>("all")
  const [createOpen, setCreateOpen] = useState(false)

  // Base claims query (default filters) — drives the stats row and shares its
  // cache entry with the all-claims tab's initial state.
  const summaryQuery = useQuery({
    queryKey: expenseKeys.claims(DEFAULT_CLAIM_FILTERS),
    queryFn: () =>
      apiFetch<ClaimsData>(`${EXPENSE_ENDPOINTS.claims}?page=1&status=&category=&employeeId=&q=`),
    staleTime: 15_000,
  })

  const summary = summaryQuery.data?.summary
  const pendingCount = summary?.pending ?? 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("portal.expense.title")}
        subtitle={t("portal.expense.subtitle")}
        icon={Receipt}
        actions={
          <Button className="h-10" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("portal.expense.newClaim")}
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaryQuery.isPending ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard
              title={t("portal.expense.stats.pending")}
              value={formatNumber(pendingCount, lang)}
              icon={Hourglass}
              iconClassName="bg-warning/15 text-warning animate-pulse"
            />
            <StatCard
              title={t("portal.expense.stats.pendingAmount")}
              value={formatBdt(summary?.pendingAmount ?? 0, lang)}
              icon={Coins}
            />
            <StatCard
              title={t("portal.expense.stats.approvedMonth")}
              value={formatBdt(summary?.approvedMonthAmount ?? 0, lang)}
              icon={BadgeCheck}
              iconClassName="bg-success/15 text-success"
            />
            <StatCard
              title={t("portal.expense.stats.totalClaims")}
              value={formatNumber(summary?.totalClaims ?? 0, lang)}
              icon={Receipt}
              iconClassName="bg-muted text-muted-foreground"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as ExpenseTab)}>
        <TabsList className="h-11 w-full max-w-md sm:w-auto">
          <TabsTrigger value="all" className="min-h-9 flex-1 gap-2 px-3 sm:px-4">
            {t("portal.expense.tabs.all")}
          </TabsTrigger>
          <TabsTrigger value="pending" className="min-h-9 flex-1 gap-2 px-3 sm:px-4">
            {t("portal.expense.tabs.pending")}
            {pendingCount > 0 && (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-warning/40 bg-warning/15 px-1.5 text-[11px] font-semibold tabular-nums text-warning-foreground">
                {formatNumber(pendingCount, lang)}
              </span>
            )}
          </TabsTrigger>
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
          {tab === "all" ? <ClaimsTab /> : <PendingTab />}
        </motion.div>
      </AnimatePresence>

      <ClaimFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
