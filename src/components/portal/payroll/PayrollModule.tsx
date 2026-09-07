"use client"

// Payroll module — BD rules payslips (period overview, generation workflow,
// payslip document preview, salary structures). Default export, mounted by PortalShell.
import { useDeferredValue, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { toast } from "sonner"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  Banknote,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Loader2,
  Pencil,
  PiggyBank,
  Plus,
  Search,
  Trash2,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatBdt, formatNumber, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  componentValueLabel,
  formatPeriod,
  payslipStatusBadgeClass,
  payslipStatusLabel,
} from "./labels"
import { PayslipDetailDialog } from "./payslip-detail-dialog"
import { StructureFormDialog } from "./structure-form-dialog"
import type {
  GenerateResult,
  PayrollOverviewData,
  PayslipsPage,
  SalaryStructureRow,
} from "./types"

const STATUS_FILTERS = ["", "draft", "confirmed", "paid"] as const

function currentPeriodLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function statusFilterLabel(status: string, t: (k: string) => string): string {
  if (!status) return t("portal.payroll.filterAll")
  return payslipStatusLabel(status, t)
}

/** Stat card with an optional helper note under the value. */
function NoteStatCard({
  title,
  value,
  note,
  icon: Icon,
  iconClassName,
}: {
  title: string
  value: string
  note?: string
  icon: LucideIcon
  iconClassName?: string
}) {
  return (
    <Card className="border-border/80 bg-card shadow-xs transition-shadow hover:shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {value}
          </p>
          {note && <p className="mt-1 text-[11px] text-muted-foreground/80">{note}</p>}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}

export default function PayrollModule() {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()

  const [period, setPeriod] = useState(currentPeriodLocal())
  const [status, setStatus] = useState("")
  const [qInput, setQInput] = useState("")
  const q = useDeferredValue(qInput)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState("slips")

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingStructure, setEditingStructure] = useState<SalaryStructureRow | null>(null)
  const [deletingStructure, setDeletingStructure] = useState<SalaryStructureRow | null>(null)

  const filters = useMemo(() => ({ period, status, q, page }), [period, status, q, page])

  const overviewQuery = useQuery({
    queryKey: ["org", "payroll", "overview", period],
    queryFn: () =>
      apiFetch<PayrollOverviewData>(`/api/org/payroll/overview?period=${encodeURIComponent(period)}`),
  })

  // UX: if the default (current) period has no payroll history but past periods
  // exist, auto-jump to the most recent one with data so the module never opens
  // on an empty screen. Uses the render-phase adjust pattern (guarded by prev
  // state) so it never loops.
  const [autoJumpedFrom, setAutoJumpedFrom] = useState<string | null>(null)
  const ov = overviewQuery.data
  if (
    ov &&
    autoJumpedFrom !== period &&
    ov.stats.generatedCount === 0 &&
    ov.periods.length > 0 &&
    !ov.periods.includes(period)
  ) {
    setAutoJumpedFrom(period)
    setPeriod(ov.periods[0])
  }

  const slipsQuery = useQuery({
    queryKey: ["org", "payroll", "payslips", filters],
    queryFn: () => {
      const params = new URLSearchParams({ period, page: String(page) })
      if (status) params.set("status", status)
      if (q) params.set("q", q)
      return apiFetch<PayslipsPage>(`/api/org/payroll/payslips?${params.toString()}`)
    },
    placeholderData: (prev) => prev,
  })

  const structuresQuery = useQuery({
    queryKey: ["org", "payroll", "structures"],
    queryFn: () => apiFetch<SalaryStructureRow[]>("/api/org/payroll/structures"),
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<GenerateResult>("/api/org/payroll/generate", {
        method: "POST",
        body: JSON.stringify({ period }),
      }),
    onSuccess: (res) => {
      setGenerateOpen(false)
      toast.success(t("portal.payroll.generateSuccess", { generated: formatNumber(res.generated, lang) }))
      if (res.skipped > 0) {
        toast.info(
          t("portal.payroll.generateSkippedToast", { skipped: formatNumber(res.skipped, lang) }),
        )
      }
      void queryClient.invalidateQueries({ queryKey: ["org", "payroll"] })
    },
    onError: () => toast.error(t("portal.payroll.generateFailed")),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/org/payroll/structures/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("portal.payroll.toastStructureDeleted"))
      setDeletingStructure(null)
      void queryClient.invalidateQueries({ queryKey: ["org", "payroll"] })
    },
    onError: (err: Error) => {
      const map: Record<string, string> = {
        is_default: t("portal.payroll.errIsDefault"),
        in_use: t("portal.payroll.errInUse"),
      }
      toast.error(map[err.message] ?? t("portal.payroll.toastSaveFailed"))
    },
  })

  const stats = overviewQuery.data?.stats
  const defaultStructure = structuresQuery.data?.find((s) => s.isDefault) ?? null
  const pages = slipsQuery.data ? Math.max(1, Math.ceil(slipsQuery.data.total / slipsQuery.data.pageSize)) : 1
  const hasFilters = status !== "" || q !== ""

  const openSlip = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("portal.payroll.title")}
        subtitle={t("portal.payroll.subtitle")}
        icon={Banknote}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                type="month"
                value={period}
                aria-label={t("portal.payroll.periodLabel")}
                onChange={(e) => {
                  setPeriod(e.target.value || currentPeriodLocal())
                  setPage(1)
                }}
                className="h-10 w-[9.5rem] bg-background"
              />
            </div>
            <Button className="h-10" onClick={() => setGenerateOpen(true)}>
              <Zap className="size-4" aria-hidden />
              {t("portal.payroll.generateBtn")}
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="slips" className="gap-1.5">
            <FileText className="size-4" aria-hidden />
            {t("portal.payroll.tabSlips")}
          </TabsTrigger>
          <TabsTrigger value="structures" className="gap-1.5">
            <Layers className="size-4" aria-hidden />
            {t("portal.payroll.tabStructures")}
          </TabsTrigger>
        </TabsList>

        {/* ── Payslips tab ── */}
        <TabsContent value="slips" className="mt-4 space-y-4">
          {/* Period quick jumps */}
          {overviewQuery.data && overviewQuery.data.periods.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("portal.payroll.periodLabel")}:
              </span>
              {overviewQuery.data.periods.slice(0, 6).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPeriod(p)
                    setPage(1)
                  }}
                  className={cn(
                    "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors",
                    p === period
                      ? "border-primary/40 bg-primary/12 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {formatPeriod(p, lang)}
                </button>
              ))}
            </div>
          )}

          {/* Stat cards */}
          {overviewQuery.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NoteStatCard
                title={t("portal.payroll.statGross")}
                value={formatBdt(stats.totalGross, lang)}
                icon={Banknote}
              />
              <NoteStatCard
                title={t("portal.payroll.statNet")}
                value={formatBdt(stats.totalNet, lang)}
                icon={Wallet}
                iconClassName="bg-success/10 text-success"
              />
              <NoteStatCard
                title={t("portal.payroll.statPf")}
                value={formatBdt(stats.totalPf, lang)}
                note={t("portal.payroll.statPfNote")}
                icon={PiggyBank}
                iconClassName="bg-primary/10 text-primary"
              />
              <NoteStatCard
                title={t("portal.payroll.statEmployees")}
                value={formatNumber(stats.generatedCount, lang)}
                note={t("portal.payroll.statEmployeesNote")}
                icon={Users}
                iconClassName="bg-warning/10 text-warning"
              />
            </div>
          ) : null}

          {/* Toolbar: status chips + search */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("portal.common.status")}>
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatus(s)
                    setPage(1)
                  }}
                  aria-pressed={status === s}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                    status === s
                      ? "border-primary/40 bg-primary/12 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {statusFilterLabel(s, t)}
                  {s && stats ? (
                    <span className="ml-1 tabular-nums opacity-70">
                      {formatNumber(
                        s === "draft"
                          ? stats.statusBreakdown.draft
                          : s === "confirmed"
                            ? stats.statusBreakdown.confirmed
                            : stats.statusBreakdown.paid,
                        lang,
                      )}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={qInput}
                placeholder={t("portal.payroll.searchPlaceholder")}
                onChange={(e) => {
                  setQInput(e.target.value)
                  setPage(1)
                }}
                className="h-10 pl-9"
              />
            </div>
          </div>

          {/* Payslip cards */}
          {slipsQuery.isPending && !slipsQuery.data ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : slipsQuery.isError || !slipsQuery.data ? (
            <EmptyState
              icon={FileText}
              title={t("portal.payroll.loadFailed")}
              action={
                <Button variant="outline" onClick={() => void slipsQuery.refetch()}>
                  {t("common.retry")}
                </Button>
              }
            />
          ) : slipsQuery.data.items.length === 0 ? (
            hasFilters ? (
              <EmptyState
                icon={Search}
                title={t("portal.payroll.noResultsTitle")}
                description={t("portal.payroll.noResultsDesc")}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatus("")
                      setQInput("")
                      setPage(1)
                    }}
                  >
                    <X className="size-4" aria-hidden />
                    {t("portal.payroll.clearFilters")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={FileText}
                title={t("portal.payroll.emptyTitle")}
                description={t("portal.payroll.emptyDesc")}
                action={
                  <Button size="sm" onClick={() => setGenerateOpen(true)}>
                    <Zap className="size-4" aria-hidden />
                    {t("portal.payroll.generateBtn")}
                  </Button>
                }
              />
            )
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {slipsQuery.data.items.map((slip, i) => {
                  const name = `${slip.employee.firstName} ${slip.employee.lastName}`
                  return (
                    <motion.div
                      key={slip.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(i, 8) * 0.03 }}
                    >
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`${t("portal.payroll.viewSlip")} — ${name}`}
                          onClick={() => openSlip(slip.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              openSlip(slip.id)
                            }
                          }}
                          className="group h-full cursor-pointer rounded-xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Avatar className="size-9 shrink-0">
                                <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">
                                  {initialsOf(name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{name}</p>
                                <p className="truncate font-mono text-[11px] font-semibold tracking-wide text-primary">
                                  {slip.employee.code}
                                </p>
                              </div>
                            </div>
                            <Badge className={cn("shrink-0", payslipStatusBadgeClass(slip.status))}>
                              {payslipStatusLabel(slip.status, t)}
                            </Badge>
                          </div>

                          <p className="mt-1.5 truncate text-xs text-muted-foreground">
                            {slip.employee.designation ?? t("portal.common.notSet")}
                          </p>

                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                            <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="truncate tabular-nums">{formatBdt(slip.gross, lang)}</span>
                              <ArrowRight
                                className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
                                aria-hidden
                              />
                              <span className="truncate font-semibold tabular-nums text-foreground">
                                {formatBdt(slip.netPay, lang)}
                              </span>
                            </div>
                            {slip.pfEmployee > 0 && (
                              <Badge variant="outline" className="shrink-0 gap-1 border-primary/25 bg-primary/8 px-1.5 text-[10px] font-medium text-primary">
                                <PiggyBank className="size-3" aria-hidden />
                                {t("portal.payroll.cardPf")} {formatBdt(slip.pfEmployee, lang)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

              {/* Pagination */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {t("portal.payroll.pageOf", {
                    page: formatNumber(slipsQuery.data.page, lang),
                    pages: formatNumber(pages, lang),
                  })}{" "}
                  · {t("portal.payroll.totalOf", { total: formatNumber(slipsQuery.data.total, lang) })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={slipsQuery.data.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    {t("portal.payroll.prev")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={slipsQuery.data.page >= pages}
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  >
                    {t("portal.payroll.next")}
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Structures tab ── */}
        <TabsContent value="structures" className="mt-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">{t("portal.payroll.structuresTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("portal.payroll.structuresSubtitle")}</p>
            </div>
            <Button
              className="h-10"
              onClick={() => {
                setEditingStructure(null)
                setFormKey((k) => k + 1)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden />
              {t("portal.payroll.newStructure")}
            </Button>
          </div>

          {structuresQuery.isPending ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : structuresQuery.isError || !structuresQuery.data ? (
            <EmptyState
              icon={Layers}
              title={t("portal.payroll.loadFailed")}
              action={
                <Button variant="outline" onClick={() => void structuresQuery.refetch()}>
                  {t("common.retry")}
                </Button>
              }
            />
          ) : structuresQuery.data.length === 0 ? (
            <EmptyState
              icon={Layers}
              title={t("portal.payroll.noStructures")}
              description={t("portal.payroll.noStructuresDesc")}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {structuresQuery.data.map((s) => (
                <Card key={s.id} className="border-border/80 shadow-xs">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">{s.name}</p>
                          {s.isDefault && (
                            <Badge className="border-primary/30 bg-primary/12 text-primary">
                              {t("portal.payroll.defaultBadge")}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t("portal.payroll.usedBySlips", { n: formatNumber(s.payslipsCount, lang) })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 text-muted-foreground hover:text-foreground"
                          aria-label={t("portal.common.edit")}
                          onClick={() => {
                            setEditingStructure(s)
                            setFormKey((k) => k + 1)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 text-muted-foreground hover:text-destructive"
                          aria-label={t("portal.common.delete")}
                          onClick={() => setDeletingStructure(s)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-border/60 pt-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                        {t("portal.payroll.componentsLabel")} ({formatNumber(s.components.length, lang)})
                      </p>
                      <ul className="mt-1.5 max-h-48 space-y-0.5 overflow-y-auto pf-scrollbar">
                        {s.components.map((c) => (
                          <li key={c.id} className="flex items-center gap-2 py-1.5">
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                c.type === "earning" ? "bg-primary" : "bg-destructive",
                              )}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                            <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground sm:inline">
                              {c.abbr}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 font-mono text-xs font-semibold tabular-nums",
                                c.type === "earning" ? "text-primary" : "text-destructive",
                              )}
                            >
                              {componentValueLabel(c, lang)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payslip document dialog */}
      <PayslipDetailDialog
        slipId={detailId}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o)
          if (!o) setDetailId(null)
        }}
      />

      {/* Generate confirm dialog */}
      <AlertDialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="size-5 text-primary" aria-hidden />
              {t("portal.payroll.generateTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("portal.payroll.generateDesc", {
                period: formatPeriod(period, lang),
                count: formatNumber(stats?.employees ?? 0, lang),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/30 px-3.5 py-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-xs text-muted-foreground">{t("portal.payroll.generatePeriod")}</span>
              <span className="font-medium">{formatPeriod(period, lang)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-xs text-muted-foreground">{t("portal.payroll.generateStructure")}</span>
              <span className="max-w-[60%] truncate font-medium">
                {defaultStructure?.name ?? t("portal.payroll.generateStructureFallback")}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-xs text-muted-foreground">{t("portal.payroll.generateEmployees")}</span>
              <span className="font-medium tabular-nums">
                {formatNumber(stats?.employees ?? 0, lang)} {t("portal.common.person")}
              </span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generateMutation.isPending}>
              {t("portal.common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "default" })}
              disabled={generateMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                generateMutation.mutate()
              }}
            >
              {generateMutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {generateMutation.isPending
                ? t("portal.payroll.generating")
                : t("portal.payroll.generateConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Structure create/edit dialog — keyed so form state resets per open */}
      <StructureFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingStructure}
      />

      {/* Structure delete confirm */}
      {deletingStructure && (
        <ConfirmDialog
          open
          onOpenChange={(o) => {
            if (!o) setDeletingStructure(null)
          }}
          title={t("portal.payroll.deleteStructureTitle")}
          description={t("portal.payroll.deleteStructureDesc", { name: deletingStructure.name })}
          confirmLabel={t("portal.common.delete")}
          cancelLabel={t("portal.common.cancel")}
          onConfirm={() => deleteMutation.mutate(deletingStructure.id)}
        />
      )}
    </div>
  )
}
