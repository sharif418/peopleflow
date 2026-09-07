"use client"

// Create appraisal dialog — employee combobox, period input
// (e.g. "2026-H1"), optional self note. A draft with all 5 criteria is
// created on the server (default score 3 each).
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ClipboardCheck, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmployeeCombobox } from "./employee-combobox"
import { PERFORMANCE_ENDPOINTS, performanceKeys, type AppraisalRow } from "./types"
import { performanceErrorMessage } from "./utils"

const PERIOD_RE = /^\d{4}-H[12]$/

export function AppraisalFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [employeeId, setEmployeeId] = useState("")
  const [period, setPeriod] = useState("")
  const [selfNote, setSelfNote] = useState("")
  const [errors, setErrors] = useState<{ employeeId?: string; period?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<AppraisalRow>(PERFORMANCE_ENDPOINTS.appraisals, {
        method: "POST",
        body: JSON.stringify({
          employeeId,
          period: period.trim().toUpperCase(),
          selfNote: selfNote.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast.success(t("portal.performance.toasts.appraisalCreated"))
      void queryClient.invalidateQueries({ queryKey: performanceKeys.all })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      const mapped = performanceErrorMessage(err, t)
      setSubmitError(mapped ?? t("portal.performance.toasts.failed"))
    },
  })

  const onSubmit = () => {
    const next: { employeeId?: string; period?: string } = {}
    if (employeeId === "") next.employeeId = t("portal.performance.appraisalCreate.vEmployee")
    if (!PERIOD_RE.test(period.trim())) next.period = t("portal.performance.appraisalCreate.vPeriod")
    setErrors(next)
    setSubmitError(null)
    if (next.employeeId === undefined && next.period === undefined) mutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!mutation.isPending) onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-primary" aria-hidden />
            {t("portal.performance.appraisalCreate.title")}
          </DialogTitle>
          <DialogDescription>{t("portal.performance.appraisalCreate.desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee combobox */}
          <div className="space-y-2">
            <Label>{t("portal.performance.appraisalCreate.employee")}</Label>
            <div aria-invalid={errors.employeeId !== undefined}>
              <EmployeeCombobox
                value={employeeId}
                onChange={setEmployeeId}
                enabled={open}
                labelKey="portal.performance.appraisalCreate"
              />
            </div>
            {errors.employeeId && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.employeeId}
              </p>
            )}
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label htmlFor="appraisal-period">{t("portal.performance.appraisalCreate.period")}</Label>
            <Input
              id="appraisal-period"
              className="h-10 font-mono"
              placeholder={t("portal.performance.appraisalCreate.periodPh")}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-invalid={errors.period !== undefined}
            />
            {errors.period ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.period}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("portal.performance.appraisalCreate.periodHint")}</p>
            )}
          </div>

          {/* Self note */}
          <div className="space-y-2">
            <Label htmlFor="appraisal-self-note">
              {t("portal.performance.appraisalCreate.selfNote")}{" "}
              <span className="font-normal text-muted-foreground">({t("portal.common.optional")})</span>
            </Label>
            <Textarea
              id="appraisal-self-note"
              className="min-h-20"
              placeholder={t("portal.performance.appraisalCreate.selfNotePh")}
              maxLength={500}
              value={selfNote}
              onChange={(e) => setSelfNote(e.target.value)}
            />
          </div>

          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {t("portal.common.cancel")}
            </Button>
            <Button type="button" className="h-10" disabled={mutation.isPending} onClick={onSubmit}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("portal.performance.appraisalCreate.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
