"use client"

// Full payslip preview — styled like an official salary document,
// with per-status workflow actions (confirm / mark paid / revert to draft).
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { BadgeCheck, Loader2, PiggyBank } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatBdt, formatDate, formatNumber, toBnDigits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { payslipStatusBadgeClass, payslipStatusLabel, formatPeriod } from "./labels"
import type { PayslipAction, PayslipDetailData } from "./types"

interface ActionSpec {
  action: PayslipAction
  label: string
  title: string
  desc: string
  destructive: boolean
}

function DocRow({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2 last:border-b-0">
      <span className={cn("text-sm", strong ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("shrink-0 font-mono text-sm tabular-nums", strong && "font-semibold")}>
        ৳{formatNumber(amount, "en")}
      </span>
    </div>
  )
}

function Stamp({ status, label }: { status: string; label: string }) {
  const tone =
    status === "paid"
      ? "border-success/60 text-success"
      : status === "confirmed"
        ? "border-primary/60 text-primary"
        : "border-muted-foreground/50 text-muted-foreground"
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute right-5 top-5 hidden -rotate-6 select-none rounded-md border-2 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] opacity-80 sm:block",
        tone,
      )}
    >
      {label}
    </div>
  )
}

export function PayslipDetailDialog({
  slipId,
  open,
  onOpenChange,
}: {
  slipId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()
  const [pendingAction, setPendingAction] = useState<ActionSpec | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["org", "payroll", "payslip", slipId],
    queryFn: () => apiFetch<PayslipDetailData>(`/api/org/payroll/payslips/${slipId}`),
    enabled: open && !!slipId,
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: PayslipAction }) =>
      apiFetch(`/api/org/payroll/payslips/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: (_res, vars) => {
      if (vars.action === "confirm") toast.success(t("portal.payroll.toastConfirmed"))
      else if (vars.action === "mark_paid") toast.success(t("portal.payroll.toastPaid"))
      else toast.success(t("portal.payroll.toastReverted"))
      setPendingAction(null)
      void queryClient.invalidateQueries({ queryKey: ["org", "payroll"] })
    },
    onError: (err: Error) => {
      if (err.message === "invalid_transition") toast.error(t("portal.payroll.errInvalidTransition"))
      else toast.error(t("portal.payroll.toastActionFailed"))
    },
  })

  const stampLabel = data
    ? data.status === "paid"
      ? t("portal.payroll.stampPaid")
      : data.status === "confirmed"
        ? t("portal.payroll.stampConfirmed")
        : t("portal.payroll.stampDraft")
    : ""

  const actions: ActionSpec[] = data
    ? [
        ...(data.status === "draft"
          ? [
              {
                action: "confirm" as const,
                label: t("portal.payroll.actionConfirm"),
                title: t("portal.payroll.confirmTitle"),
                desc: t("portal.payroll.confirmDesc"),
                destructive: false,
              },
            ]
          : []),
        ...(data.status === "confirmed"
          ? [
              {
                action: "mark_paid" as const,
                label: t("portal.payroll.actionMarkPaid"),
                title: t("portal.payroll.paidTitle"),
                desc: t("portal.payroll.paidDesc"),
                destructive: false,
              },
              {
                action: "revert_draft" as const,
                label: t("portal.payroll.actionRevert"),
                title: t("portal.payroll.revertTitle"),
                desc: t("portal.payroll.revertDesc"),
                destructive: true,
              },
            ]
          : []),
      ]
    : []

  const fields: { k: string; v: string }[] = data
    ? [
        { k: t("portal.payroll.docEmpCode"), v: data.employee.code },
        { k: t("portal.payroll.docEmpName"), v: `${data.employee.firstName} ${data.employee.lastName}` },
        { k: t("portal.payroll.docEmpDesignation"), v: data.employee.designation ?? "—" },
        { k: t("portal.payroll.docEmpDepartment"), v: data.employee.department ?? "—" },
        {
          k: t("portal.payroll.docEmpJoining"),
          v: data.employee.dateOfJoining ? formatDate(data.employee.dateOfJoining, lang) : "—",
        },
        {
          k: t("portal.payroll.generateStructure"),
          v: data.structure ? data.structure.name : t("portal.payroll.generateStructureFallback"),
        },
      ]
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto pf-scrollbar sm:max-w-2xl">
        {isPending || !data ? (
          <div className="space-y-4 py-2">
            <DialogTitle className="sr-only">{t("portal.payroll.dialogTitle")}</DialogTitle>
            <Skeleton className="mx-auto h-6 w-56" />
            <Skeleton className="mx-auto h-4 w-72" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
            <div className="flex justify-end gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <DialogTitle className="sr-only">{t("common.error")}</DialogTitle>
            <p className="text-sm font-semibold">{t("common.error")}</p>
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : (
          <>
            <DialogTitle className="sr-only">
              {t("portal.payroll.dialogTitle")} — {data.employee.firstName} {data.employee.lastName}
            </DialogTitle>

            {/* Official document */}
            <div className="pf-payslip-print relative rounded-xl border bg-background p-4 shadow-xs sm:p-6">
              <Stamp status={data.status} label={stampLabel} />

              {/* Org header */}
              <div className="text-center">
                <p className="text-base font-bold tracking-tight sm:text-lg">{data.org.name}</p>
                {data.org.address && <p className="mt-0.5 text-xs text-muted-foreground">{data.org.address}</p>}
                <p className="mt-3 text-sm font-semibold text-primary">{t("portal.payroll.docPayslipTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("portal.payroll.docPeriod")}:{" "}
                  <span className="font-medium text-foreground">{formatPeriod(data.period, lang)}</span>
                </p>
              </div>

              <Separator className="my-4" />

              {/* Employee block */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
                {fields.map((f) => (
                  <div key={f.k} className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">{f.k}</p>
                    <p className="truncate text-sm font-medium" title={f.v}>
                      {f.v}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Earnings */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {t("portal.payroll.earningsTable")}
                </p>
                {data.items
                  .filter((i) => i.type !== "deduction")
                  .map((i) => (
                    <DocRow key={i.id} label={i.label} amount={i.amount} />
                  ))}
                <DocRow label={t("portal.payroll.totalEarnings")} amount={data.totalEarnings} strong />
              </div>

              {/* Deductions */}
              <div className="mt-5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                  {t("portal.payroll.deductionsTable")}
                </p>
                {data.items.filter((i) => i.type === "deduction").length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">{t("portal.common.none")}</p>
                ) : (
                  data.items
                    .filter((i) => i.type === "deduction")
                    .map((i) => <DocRow key={i.id} label={i.label} amount={i.amount} />)
                )}
                <DocRow label={t("portal.payroll.totalDeductions")} amount={data.totalDeductions} strong />
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("portal.payroll.grossLine")}</span>
                  <span className="font-mono font-medium tabular-nums">{formatBdt(data.gross, lang)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-success/10 px-4 py-3">
                  <span className="text-sm font-bold text-success">{t("portal.payroll.netPay")}</span>
                  <span className="font-mono text-xl font-bold tabular-nums text-success">
                    {formatBdt(data.netPay, lang)}
                  </span>
                </div>
              </div>

              {/* PF footer */}
              <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <PiggyBank className="size-3.5" aria-hidden />
                  {t("portal.payroll.pfInfoTitle")}
                </p>
                {data.pfEmployee === 0 ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">{t("portal.payroll.pfDisabledNote")}</p>
                ) : (
                  <>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          {t("portal.payroll.pfEmployeePart", { percent: toBnDigits(data.org.pfPercent) })}
                        </p>
                        <p className="font-mono text-sm font-semibold tabular-nums">
                          {formatBdt(data.pfEmployee, lang)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          {t("portal.payroll.pfEmployerPart", { percent: toBnDigits(data.org.pfPercent) })}
                        </p>
                        <p className="font-mono text-sm font-semibold tabular-nums">
                          {formatBdt(data.pfEmployer, lang)}
                        </p>
                      </div>
                      <div className="border-l border-primary/15">
                        <p className="text-[11px] text-muted-foreground">{t("portal.payroll.pfTotalSaved")}</p>
                        <p className="font-mono text-sm font-semibold tabular-nums text-primary">
                          {formatBdt(data.pfEmployee + data.pfEmployer, lang)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{t("portal.payroll.pfMatchNote")}</p>
                  </>
                )}
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground/70">
                {t("portal.payroll.generatedOn", { date: formatDate(data.createdAt, lang) })}
              </p>
            </div>

            {/* Actions per status */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge className={payslipStatusBadgeClass(data.status)}>
                {data.status === "paid" && <BadgeCheck className="size-3.5" aria-hidden />}
                {payslipStatusLabel(data.status, t)}
              </Badge>
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Button
                    key={a.action}
                    variant={a.destructive ? "outline" : "default"}
                    size="sm"
                    className="h-9"
                    disabled={actionMutation.isPending}
                    onClick={() => setPendingAction(a)}
                  >
                    {actionMutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    {a.label}
                  </Button>
                ))}
                {data.status === "paid" && (
                  <Badge
                    variant="outline"
                    className="h-9 border-success/30 bg-success/10 px-3 text-success"
                  >
                    <BadgeCheck className="size-3.5" aria-hidden />
                    {t("portal.payroll.statusPaid")}
                  </Badge>
                )}
              </div>
            </div>

            {pendingAction && (
              <ConfirmDialog
                open
                onOpenChange={(o) => {
                  if (!o) setPendingAction(null)
                }}
                title={pendingAction.title}
                description={pendingAction.desc}
                confirmLabel={pendingAction.label}
                cancelLabel={t("portal.common.cancel")}
                destructive={pendingAction.destructive}
                onConfirm={() => {
                  if (slipId) actionMutation.mutate({ id: slipId, action: pendingAction.action })
                }}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
