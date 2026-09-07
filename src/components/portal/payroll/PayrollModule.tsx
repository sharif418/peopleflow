"use client"

// Payroll module — BD rules payslips (period overview, generation workflow,
// payslip document preview, salary structures). Default export, mounted by the
// portal feature route. Thin shell: owns state, queries and mutations; tabs,
// cards and dialogs live in co-located components.
import { useDeferredValue, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Banknote, FileText, Layers, Zap } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { PayslipsTab } from "./payslips-tab"
import { StructuresTab } from "./structures-tab"
import { RunPayrollDialog } from "./run-payroll-dialog"
import { PayslipDetailDialog } from "./payslip-detail-dialog"
import { StructureFormDialog } from "./structure-form-dialog"
import type {
  GenerateResult,
  PayrollOverviewData,
  PayslipsPage,
  SalaryStructureRow,
} from "./types"

function currentPeriodLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
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

  const selectPeriod = (p: string) => {
    setPeriod(p)
    setPage(1)
  }

  const selectStatus = (s: string) => {
    setStatus(s)
    setPage(1)
  }

  const changeQ = (value: string) => {
    setQInput(value)
    setPage(1)
  }

  const clearFilters = () => {
    setStatus("")
    setQInput("")
    setPage(1)
  }

  const openStructureForm = (editing: SalaryStructureRow | null) => {
    setEditingStructure(editing)
    setFormKey((k) => k + 1)
    setFormOpen(true)
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
          <PayslipsTab
            period={period}
            onPeriodSelect={selectPeriod}
            periods={overviewQuery.data?.periods}
            stats={stats}
            statsPending={overviewQuery.isPending}
            status={status}
            onStatusChange={selectStatus}
            qInput={qInput}
            onQInputChange={changeQ}
            slipsQuery={slipsQuery}
            pages={pages}
            setPage={setPage}
            hasFilters={hasFilters}
            onClearFilters={clearFilters}
            onOpenSlip={openSlip}
            onGenerate={() => setGenerateOpen(true)}
          />
        </TabsContent>

        {/* ── Structures tab ── */}
        <TabsContent value="structures" className="mt-4 space-y-4">
          <StructuresTab
            structuresQuery={structuresQuery}
            onNew={() => openStructureForm(null)}
            onEdit={(s) => openStructureForm(s)}
            onDelete={setDeletingStructure}
          />
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
      <RunPayrollDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        period={period}
        stats={stats}
        defaultStructure={defaultStructure}
        isPending={generateMutation.isPending}
        onConfirm={() => generateMutation.mutate()}
      />

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
