"use client"

// CreateOrgDialog shell — 4-step wizard (info → plan → admin → review) using
// RHF + zod; step UIs live in co-located create-org-* files.
import { useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/fetcher"
import { useI18n } from "@/lib/i18n"
import { FEATURES, PLAN_MAP } from "@/lib/features"
import { CreateOrgStepIndicator } from "./create-org-step-indicator"
import { CreateOrgInfoStep } from "./create-org-info-step"
import { CreateOrgPlanStep } from "./create-org-plan-step"
import { CreateOrgAdminStep } from "./create-org-admin-step"
import { CreateOrgReviewStep } from "./create-org-review-step"
import { createSchema, slugify, STEP_FIELDS, type CreateForm } from "./create-org-schema"
import type { CreateOrgResponse } from "./types"

export function CreateOrgDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (orgId: string) => void
}) {
  const { t, lang } = useI18n()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const subdomainEdited = useRef(false)

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      planKey: "growth",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    },
    mode: "onTouched",
  })

  const createMutation = useMutation({
    mutationFn: (values: CreateForm) =>
      apiFetch<CreateOrgResponse>("/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (org) => {
      toast.success(t("admin.createOrg.created"))
      void queryClient.invalidateQueries({ queryKey: ["admin"] })
      resetAndClose()
      onCreated(org.id)
    },
    onError: (err: Error) => {
      const message = err.message
      setServerError(message)
      if (message.includes("subdomain")) {
        form.setError("subdomain", { message: t("admin.createOrg.subdomainTaken") })
        setStep(0)
      } else if (message.includes("email")) {
        form.setError("adminEmail", { message: t("admin.createOrg.adminEmailTaken") })
        setStep(2)
      } else {
        toast.error(t("admin.createOrg.createFailed"), { description: message })
      }
    },
  })

  const resetAndClose = () => {
    setStep(0)
    setServerError(null)
    setShowPassword(false)
    subdomainEdited.current = false
    form.reset()
    onOpenChange(false)
  }

  const goTo = async (target: number) => {
    if (target > step) {
      const fields = STEP_FIELDS[step]
      if (fields) {
        const valid = await form.trigger(fields)
        if (!valid) return
      }
    }
    setServerError(null)
    setStep(Math.min(3, Math.max(0, target)))
  }

  const submit = form.handleSubmit((values) => {
    setServerError(null)
    createMutation.mutate(values)
  })

  const watch = useWatch({ control: form.control })
  const name = watch?.name ?? ""
  const subdomain = watch?.subdomain ?? ""
  const planKey = watch?.planKey ?? "growth"
  const adminName = watch?.adminName ?? ""
  const adminEmail = watch?.adminEmail ?? ""
  const plan = PLAN_MAP[planKey]

  const planFeatures = plan.features
    .map((key) => FEATURES.find((f) => f.key === key))
    .filter((f): f is (typeof FEATURES)[number] => Boolean(f))

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto sm:max-w-xl pf-scrollbar">
        <DialogHeader className="pb-4">
          <DialogTitle>{t("admin.createOrg.title")}</DialogTitle>
          <DialogDescription>{t("admin.createOrg.subtitle")}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <CreateOrgStepIndicator step={step} onGoTo={(i) => void goTo(i)} />

        <form onSubmit={submit} className="space-y-4" noValidate>
          {/* ── Step 1: organization info ── */}
          {step === 0 && (
            <CreateOrgInfoStep
              control={form.control}
              subdomain={subdomain}
              onNameInput={(value) => {
                if (!subdomainEdited.current) {
                  form.setValue("subdomain", slugify(value), {
                    shouldValidate: form.formState.touchedFields.subdomain === true,
                  })
                }
              }}
              onSubdomainInput={() => {
                subdomainEdited.current = true
              }}
            />
          )}

          {/* ── Step 2: plan ── */}
          {step === 1 && <CreateOrgPlanStep control={form.control} />}

          {/* ── Step 3: admin account ── */}
          {step === 2 && (
            <CreateOrgAdminStep
              control={form.control}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
            />
          )}

          {/* ── Step 4: review ── */}
          {step === 3 && (
            <CreateOrgReviewStep
              name={name}
              subdomain={subdomain}
              plan={plan}
              adminName={adminName}
              adminEmail={adminEmail}
              planFeatures={planFeatures}
            />
          )}

          {serverError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <DialogFooter className="gap-2 pt-2">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => void goTo(step - 1)} disabled={createMutation.isPending}>
                <ChevronLeft className="h-4 w-4" aria-hidden />
                {t("admin.createOrg.back")}
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={resetAndClose} disabled={createMutation.isPending}>
                {t("common.cancel")}
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" onClick={() => void goTo(step + 1)}>
                {t("admin.createOrg.next")}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button type="submit" disabled={createMutation.isPending || name.length < 2}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {createMutation.isPending ? t("admin.createOrg.submitting") : t("admin.createOrg.submit")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
