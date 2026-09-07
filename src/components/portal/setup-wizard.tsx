"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Network,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import { useSessionStore } from "@/store/session"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { planFor } from "@/lib/features"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PeopleFlowLogo } from "@/components/shared/peopleflow-logo"

interface ShiftRow {
  name: string
  startTime: string
  endTime: string
}

interface EmpRow {
  firstName: string
  lastName: string
  phone: string
  departmentName: string
}

const STEP_ICONS = [Sparkles, Network, Briefcase, Clock, Users, CheckCircle2]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function ChipsStep({
  items,
  onChange,
  itemPh,
  addLabel,
  emptyHint,
}: {
  items: string[]
  onChange: (items: string[]) => void
  itemPh: string
  addLabel: string
  emptyHint: string
}) {
  const [draft, setDraft] = useState("")

  const add = () => {
    const name = draft.trim()
    if (!name) return
    if (items.some((i) => i.toLowerCase() === name.toLowerCase())) {
      setDraft("")
      return
    }
    onChange([...items, name])
    setDraft("")
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={itemPh}
          className="h-11 flex-1"
          autoFocus
          aria-label={itemPh}
        />
        <Button type="submit" variant="outline" className="h-11 shrink-0">
          <Plus className="size-4" aria-hidden />
          <span className="hidden sm:inline">{addLabel}</span>
        </Button>
      </form>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="h-9 max-w-full gap-1.5 rounded-full bg-primary/10 pl-3 pr-1.5 text-sm font-medium text-primary"
            >
              <span className="max-w-48 truncate">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                aria-label="remove"
                className="flex size-6 items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
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

  const stepMeta = [
    { title: t("portal.wizard.step1Title"), icon: Sparkles },
    { title: t("portal.wizard.step2Title"), icon: Network },
    { title: t("portal.wizard.step3Title"), icon: Briefcase },
    { title: t("portal.wizard.step4Title"), icon: Clock },
    { title: t("portal.wizard.step5Title"), icon: Users },
    { title: t("portal.wizard.step6Title"), icon: CheckCircle2 },
  ]

  // ─── Success screen ────────────────────────────────────────────────────────
  if (finished) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-12 text-center sm:py-16">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="flex size-20 items-center justify-center rounded-full bg-success/15 text-success"
        >
          <CheckCircle2 className="size-10" aria-hidden />
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("portal.wizard.successTitle")}</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("portal.wizard.successDesc")}</p>
        </div>
        <Button size="lg" className="h-12 px-8" onClick={onDone}>
          {t("portal.wizard.goDashboard")}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    )
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
      <div className="mt-8">
        <div className="flex items-center justify-between gap-1">
          {stepMeta.map((meta, i) => {
            const Icon = meta.icon
            const done = i < step
            const current = i === step
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                    done && "border-success bg-success/15 text-success",
                    current && "border-primary bg-primary/12 text-primary",
                    !done && !current && "border-border bg-muted/40 text-muted-foreground",
                  )}
                  aria-current={current ? "step" : undefined}
                >
                  {done ? <Check className="size-4" aria-hidden /> : <Icon className="size-4.5" aria-hidden />}
                </div>
                <span
                  className={cn(
                    "hidden text-center text-[11px] font-medium sm:block",
                    current ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {meta.title}
                </span>
              </div>
            )
          })}
        </div>
        <Progress value={((step + 1) / stepCount) * 100} className="mt-4 h-1.5" />
        <p className="mt-2 text-center text-xs text-muted-foreground tabular-nums">
          {t("portal.wizard.stepOf", { current: step + 1, total: stepCount })}
        </p>
      </div>

      {/* Step content */}
      <div className="mt-8 rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t("portal.wizard.welcomeTitle")}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{t("portal.wizard.welcomeDesc")}</p>
            </div>
            {org && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {t("portal.wizard.yourOrg")}
                </p>
                <div className="mt-2 space-y-1.5 text-sm">
                  <p className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t("portal.wizard.orgName")}</span>
                    <span className="truncate font-semibold">{org.name}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t("portal.wizard.subdomain")}</span>
                    <span className="font-mono text-xs font-medium">{org.subdomain}.peopleflow.com</span>
                  </p>
                  {plan && (
                    <p className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{t("portal.wizard.plan")}</span>
                      <span className="font-semibold">{plan.nameBn}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{t("portal.wizard.willSetup")}</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {[
                  t("portal.wizard.willSetupDepts"),
                  t("portal.wizard.willSetupDesigs"),
                  t("portal.wizard.willSetupShifts"),
                  t("portal.wizard.willSetupEmps"),
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight">{t("portal.wizard.step2Title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("portal.wizard.step2Desc")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">{t("portal.wizard.step2Hint")}</p>
            </div>
            <ChipsStep
              items={depts}
              onChange={setDepts}
              itemPh={t("portal.wizard.itemPh")}
              addLabel={t("portal.wizard.addItem")}
              emptyHint={t("portal.wizard.emptyList")}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight">{t("portal.wizard.step3Title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("portal.wizard.step3Desc")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">{t("portal.wizard.step3Hint")}</p>
            </div>
            <ChipsStep
              items={desigs}
              onChange={setDesigs}
              itemPh={t("portal.wizard.itemPh")}
              addLabel={t("portal.wizard.addItem")}
              emptyHint={t("portal.wizard.emptyList")}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight">{t("portal.wizard.step4Title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("portal.wizard.step4Desc")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">{t("portal.wizard.step4Hint")}</p>
            </div>
            <div className="space-y-3">
              {shifts.map((sh, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-[1fr_120px_120px_auto]"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor={`shift-name-${idx}`} className="text-xs text-muted-foreground">
                      {t("portal.shifts.formName")}
                    </Label>
                    <Input
                      id={`shift-name-${idx}`}
                      className="h-10"
                      placeholder={t("portal.shifts.namePh")}
                      value={sh.name}
                      onChange={(e) =>
                        setShifts((rows) => rows.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`shift-start-${idx}`} className="text-xs text-muted-foreground">
                      {t("portal.common.startTime")}
                    </Label>
                    <Input
                      id={`shift-start-${idx}`}
                      className="h-10 tabular-nums"
                      type="time"
                      value={sh.startTime}
                      onChange={(e) =>
                        setShifts((rows) => rows.map((r, i) => (i === idx ? { ...r, startTime: e.target.value } : r)))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`shift-end-${idx}`} className="text-xs text-muted-foreground">
                      {t("portal.common.endTime")}
                    </Label>
                    <Input
                      id={`shift-end-${idx}`}
                      className="h-10 tabular-nums"
                      type="time"
                      value={sh.endTime}
                      onChange={(e) =>
                        setShifts((rows) => rows.map((r, i) => (i === idx ? { ...r, endTime: e.target.value } : r)))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive hover:bg-destructive/10"
                    disabled={shifts.length <= 1}
                    onClick={() => setShifts((rows) => rows.filter((_, i) => i !== idx))}
                    aria-label={t("portal.wizard.remove")}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full border-dashed"
                onClick={() => setShifts((rows) => [...rows, { name: "", startTime: "09:00", endTime: "18:00" }])}
              >
                <Plus className="size-4" aria-hidden />
                {t("portal.wizard.addRow")}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight">{t("portal.wizard.step5Title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("portal.wizard.step5Desc")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                {t("portal.common.optional")} — {t("portal.wizard.step5Hint")}
              </p>
            </div>
            <div className="space-y-3">
              {employees.map((emp, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor={`emp-first-${idx}`} className="text-xs text-muted-foreground">
                      {t("portal.wizard.empFirstName")}
                    </Label>
                    <Input
                      id={`emp-first-${idx}`}
                      className="h-10"
                      placeholder={t("portal.employees.firstNamePh")}
                      value={emp.firstName}
                      onChange={(e) =>
                        setEmployees((rows) => rows.map((r, i) => (i === idx ? { ...r, firstName: e.target.value } : r)))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`emp-last-${idx}`} className="text-xs text-muted-foreground">
                      {t("portal.wizard.empLastName")}
                    </Label>
                    <Input
                      id={`emp-last-${idx}`}
                      className="h-10"
                      placeholder={t("portal.employees.lastNamePh")}
                      value={emp.lastName}
                      onChange={(e) =>
                        setEmployees((rows) => rows.map((r, i) => (i === idx ? { ...r, lastName: e.target.value } : r)))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`emp-phone-${idx}`} className="text-xs text-muted-foreground">
                      {t("portal.wizard.empPhone")}
                    </Label>
                    <Input
                      id={`emp-phone-${idx}`}
                      className="h-10"
                      inputMode="tel"
                      placeholder={t("portal.employees.phonePh")}
                      value={emp.phone}
                      onChange={(e) =>
                        setEmployees((rows) => rows.map((r, i) => (i === idx ? { ...r, phone: e.target.value } : r)))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("portal.wizard.empDept")}</Label>
                    <Select
                      value={emp.departmentName}
                      onValueChange={(v) =>
                        setEmployees((rows) => rows.map((r, i) => (i === idx ? { ...r, departmentName: v } : r)))
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder={t("portal.employees.selectDepartment")} />
                      </SelectTrigger>
                      <SelectContent>
                        {depts.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={employees.length <= 1}
                      onClick={() => setEmployees((rows) => rows.filter((_, i) => i !== idx))}
                    >
                      <X className="size-4" aria-hidden />
                      {t("portal.wizard.remove")}
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full border-dashed"
                onClick={() =>
                  setEmployees((rows) => [...rows, { firstName: "", lastName: "", phone: "", departmentName: "" }])
                }
              >
                <Plus className="size-4" aria-hidden />
                {t("portal.wizard.addRow")}
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold tracking-tight">{t("portal.wizard.step6Title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("portal.wizard.step6Desc")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: t("portal.wizard.step6Depts"), value: depts.length, icon: Network },
                { label: t("portal.wizard.step6Desigs"), value: desigs.length, icon: Briefcase },
                { label: t("portal.wizard.step6Shifts"), value: shifts.filter((s) => s.name.trim()).length, icon: Clock },
                { label: t("portal.wizard.step6Emps"), value: filledEmployees.length, icon: Users },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-xl border border-border/70 bg-muted/30 p-3 text-center">
                    <Icon className="mx-auto size-5 text-primary" aria-hidden />
                    <p className="mt-1.5 text-2xl font-bold tabular-nums">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                )
              })}
            </div>
            {(depts.length > 0 || desigs.length > 0) && (
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  {depts.map((d) => (
                    <Badge key={d} variant="secondary" className="bg-primary/10 font-normal text-primary">
                      {d}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {desigs.map((d) => (
                    <Badge key={d} variant="outline" className="font-normal">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
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
