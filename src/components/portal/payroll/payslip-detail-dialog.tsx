"use client"

// Full payslip preview dialog — loads the payslip detail, renders the official
// document (payslip-document.tsx) and per-status workflow actions
// (confirm / mark paid / revert to draft).
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { BadgeCheck, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { payslipStatusBadgeClass, payslipStatusLabel } from "./labels"
import { PayslipDocument } from "./payslip-document"
import type { PayslipAction, PayslipDetailData } from "./types"

interface ActionSpec {
  action: PayslipAction
  label: string
  title: string
  desc: string
  destructive: boolean
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
  const { t } = useI18n()
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
            <PayslipDocument data={data} />

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
