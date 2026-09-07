"use client"

// Org setup wizard shell — owns step state, per-step validation and the final
// submit mutation; each step's UI lives in ./wizard/steps/*.
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import { useSessionStore } from "@/store/session"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { planFor } from "@/lib/features"
import { Button } from "@/components/ui/button"
import { PeopleFlowLogo } from "@/components/shared/peopleflow-logo"
import { StepIndicator } from "@/components/portal/wizard/step-indicator"
import { SuccessScreen } from "@/components/portal/wizard/success-screen"
import { WelcomeStep } from "@/components/portal/wizard/steps/welcome-step"
import { DepartmentsStep } from "@/components/portal/wizard/steps/departments-step"
import { DesignationsStep } from "@/components/portal/wizard/steps/designations-step"
import { ShiftsStep } from "@/components/portal/wizard/steps/shifts-step"
import { EmployeesStep } from "@/components/portal/wizard/steps/employees-step"
import { ReviewStep } from "@/components/portal/wizard/steps/review-step"
import type { EmpRow, ShiftRow } from "@/components/portal/wizard/types"

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function SetupWizard({
  onSkip,
  onCompleted,
  onDone,
}: {
  onSkip: () => void
  onCompleted: () => void
  onDone: () => void
}) {
  const { org, refresh } = useSessionStore()
  const { t } = useI18n()
  const [step, setStep] = useState(0)
  const [depts, setDepts] = useState<string[]>([])
  const [desigs, setDesigs] = useState<string[]>([])
  const [shifts, setShifts] = useState<ShiftRow[]>([
    { name: "", startTime: "09:00", endTime: "18:00" },
  ])
  const [employees, setEmployees] = useState<EmpRow[]>([
    { firstName: "", lastName: "", phone: "", departmentName: "" },
  ])
  const [validation, setValidation] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)

  const plan = org ? planFor(org.planKey) : null
  const stepCount = 6

  const filledEmployees = employees.filter((e) => e.firstName.trim() !== "" || e.lastName.trim() !== "")

  const validateStep = (s: number): string | null => {
    if (s === 1 && depts.length === 0) return t("portal.wizard.emptyList")
    if (s === 2 && desigs.length === 0) return t("portal.wizard.emptyList")
    if (s === 3) {
      const valid = shifts.filter((sh) => sh.name.trim() !== "")
      if (valid.length === 0) return t("portal.wizard.emptyList")
      for (const sh of valid) {
        if (sh.name.trim().length < 2) return t("portal.wizard.vName")
        if (!sh.startTime || !sh.endTime) return t("portal.wizard.vTime")
      }
    }
    if (s === 4) {
      for (const e of employees) {
        const first = e.firstName.trim()
        const last = e.lastName.trim()
        if ((first && !last) || (!first && last)) return t("portal.wizard.vEmpName")
        if (first && first.length < 2) return t("portal.wizard.vEmpName")
        if (last && last.length < 2) return t("portal.wizard.vEmpName")
      }
    }
    return null
  }

  const goNext = () => {
    const err = validateStep(step)
    setValidation(err)
    if (!err) setStep((s) => Math.min(stepCount - 1, s + 1))
  }

  const submitMutation = useMutation({
    mutationFn: () => {
      const payload = {
        departments: depts.map((name) => ({ name })),
        designations: desigs.map((name) => ({ name })),
        shifts: shifts
          .filter((sh) => sh.name.trim().length >= 2)
          .map((sh) => ({ name: sh.name.trim(), startTime: sh.startTime, endTime: sh.endTime })),
        employees: filledEmployees.map((e) => ({
          firstName: e.firstName.trim(),
          lastName: e.lastName.trim(),
          phone: e.phone.trim() || undefined,
          dateOfJoining: todayIso(),
          departmentName: e.departmentName || undefined,
        })),
      }
      return apiFetch<{ departments: number; designations: number; shifts: number; employees: number }>(
        "/api/org/setup",
        { method: "POST", body: JSON.stringify(payload) },
      )
    },
    onSuccess: async () => {
      toast.success(t("portal.wizard.successTitle"))
      setFinished(true)
      // Keep the wizard mounted for the success screen while the session refresh
      // flips org.setupCompleted to true.
      onCompleted()
      await refresh()
    },
    onError: () => {
      setValidation(t("portal.wizard.errorDesc"))
    },
  })

  // ─── Success screen ────────────────────────────────────────────────────────
  if (finished) {
    return <SuccessScreen onDone={onDone} />
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <PeopleFlowLogo markClassName="h-8 w-8" />
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {t("portal.wizard.skip")}
        </button>
      </div>

      {/* Step indicator */}
      <StepIndicator step={step} stepCount={stepCount} />

      {/* Step content */}
      <div className="mt-8 rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
        {step === 0 && <WelcomeStep org={org} plan={plan} />}

        {step === 1 && <DepartmentsStep items={depts} onChange={setDepts} />}

        {step === 2 && <DesignationsStep items={desigs} onChange={setDesigs} />}

        {step === 3 && <ShiftsStep shifts={shifts} setShifts={setShifts} />}

        {step === 4 && (
          <EmployeesStep employees={employees} setEmployees={setEmployees} departments={depts} />
        )}

        {step === 5 && (
          <ReviewStep
            depts={depts}
            desigs={desigs}
            shifts={shifts}
            employeeCount={filledEmployees.length}
          />
        )}

        {validation && (
          <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {validation}
          </p>
        )}

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between gap-2 border-t border-border/70 pt-4">
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            onClick={() => {
              setValidation(null)
              setStep((s) => Math.max(0, s - 1))
            }}
            disabled={step === 0 || submitMutation.isPending}
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("portal.common.back")}</span>
          </Button>

          {step < stepCount - 1 ? (
            <Button type="button" className="h-10" onClick={goNext}>
              {t("portal.common.next")}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-10"
              onClick={() => {
                setValidation(null)
                submitMutation.mutate()
              }}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="size-4" aria-hidden />
              )}
              {submitMutation.isPending ? t("portal.wizard.finishing") : t("portal.wizard.finish")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
