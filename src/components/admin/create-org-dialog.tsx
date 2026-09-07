"use client"

// CreateOrgDialog — 4-step wizard (info → plan → admin → review) using RHF + zod
import { useRef, useState } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Globe, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { apiFetch } from "@/lib/fetcher"
import { useI18n } from "@/lib/i18n"
import { formatBdt } from "@/lib/format"
import { FEATURES, PLAN_MAP, PLANS } from "@/lib/features"
import { cn } from "@/lib/utils"
import type { CreateOrgResponse } from "./types"

const SUBDOMAIN_RE = /^[a-z0-9-]{3,30}$/

const createSchema = z.object({
  name: z.string().min(2),
  subdomain: z.string().regex(SUBDOMAIN_RE),
  planKey: z.enum(["starter", "growth", "enterprise"]),
  adminName: z.string().min(2),
  adminEmail: z.email(),
  adminPassword: z.string().min(6),
})

type CreateForm = z.infer<typeof createSchema>

const STEP_FIELDS: (keyof CreateForm)[][] = [["name", "subdomain"], ["planKey"], ["adminName", "adminEmail", "adminPassword"]]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

const STEP_KEYS = ["step1", "step2", "step3", "step4"] as const

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
        <ol className="flex items-center gap-1 overflow-x-auto pb-4" aria-label={t("admin.createOrg.step", { current: step + 1, total: 4 })}>
          {STEP_KEYS.map((key, i) => (
            <li key={key} className="flex shrink-0 items-center gap-1">
              {i > 0 && <Separator className="mx-1 h-px w-4 bg-border sm:w-8" />}
              <button
                type="button"
                onClick={() => void goTo(i)}
                className="flex items-center gap-2 rounded-full px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                aria-current={step === i ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
                    i < step
                      ? "bg-success text-success-foreground"
                      : i === step
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                </span>
                <span className={cn("hidden whitespace-nowrap sm:inline", step === i ? "text-foreground" : "text-muted-foreground")}>
                  {t(`admin.createOrg.${key}`)}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {/* ── Step 1: organization info ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="co-name">{t("admin.createOrg.orgName")}</Label>
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <div className="space-y-1">
                      <Input
                        id="co-name"
                        placeholder={t("admin.createOrg.orgNamePlaceholder")}
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e)
                          if (!subdomainEdited.current) {
                            form.setValue("subdomain", slugify(e.target.value), {
                              shouldValidate: form.formState.touchedFields.subdomain === true,
                            })
                          }
                        }}
                        onBlur={field.onBlur}
                        aria-invalid={Boolean(fieldState.error)}
                      />
                      {fieldState.error && (
                        <p className="text-xs text-destructive">{t("admin.createOrg.orgNameMin")}</p>
                      )}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-subdomain">{t("admin.createOrg.subdomain")}</Label>
                <Controller
                  control={form.control}
                  name="subdomain"
                  render={({ field, fieldState }) => (
                    <div className="space-y-1">
                      <Input
                        id="co-subdomain"
                        placeholder={t("admin.createOrg.subdomainPlaceholder")}
                        className="font-mono lowercase"
                        value={field.value}
                        onChange={(e) => {
                          subdomainEdited.current = true
                          field.onChange(e.target.value.toLowerCase())
                        }}
                        onBlur={field.onBlur}
                        aria-invalid={Boolean(fieldState.error)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {fieldState.error ? (
                          <span className="text-destructive">{t("admin.createOrg.subdomainInvalid")}</span>
                        ) : (
                          t("admin.createOrg.subdomainHint")
                        )}
                      </p>
                    </div>
                  )}
                />
              </div>

              <Card className="bg-muted/40">
                <div className="flex items-center gap-3 p-3">
                  <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 text-sm">
                    <p className="text-xs text-muted-foreground">{t("admin.createOrg.sitePreview")}</p>
                    <p className="truncate font-mono text-[13px]">{subdomain || "…"}.peopleflow.com</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── Step 2: plan ── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{t("admin.createOrg.planSelect")}</p>
              <Controller
                control={form.control}
                name="planKey"
                render={({ field }) => (
                  <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
                    {PLANS.map((p) => {
                      const selected = field.value === p.key
                      const topFeatures = p.features.slice(0, 3)
                      return (
                        <button
                          key={p.key}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.onChange(p.key)}
                          className={cn(
                            "rounded-xl border p-4 text-left transition-all",
                            selected
                              ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                              : "border-border/80 hover:border-primary/40 hover:shadow-xs",
                          )}
                        >
                          <p className="text-sm font-semibold">{lang === "bn" ? p.nameBn : p.nameEn}</p>
                          <p className="mt-1 text-lg font-bold tabular-nums text-primary">
                            {formatBdt(p.priceBdt, lang)}
                            <span className="text-xs font-normal text-muted-foreground">
                              {t("admin.createOrg.planPerMonth")}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {p.maxEmployees === -1
                              ? t("admin.createOrg.planUnlimited")
                              : t("admin.createOrg.planEmployees", { max: p.maxEmployees })}
                          </p>
                          <ul className="mt-2.5 space-y-1">
                            {topFeatures.map((fkey) => {
                              const f = FEATURES.find((x) => x.key === fkey)
                              if (!f) return null
                              return (
                                <li key={fkey} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Check className="h-3 w-3 shrink-0 text-success" aria-hidden />
                                  <span className="truncate">{lang === "bn" ? f.nameBn : f.nameEn}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </button>
                      )
                    })}
                  </div>
                )}
              />
            </div>
          )}

          {/* ── Step 3: admin account ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="co-admin-name">{t("admin.createOrg.adminName")}</Label>
                <Controller
                  control={form.control}
                  name="adminName"
                  render={({ field, fieldState }) => (
                    <div className="space-y-1">
                      <Input
                        id="co-admin-name"
                        placeholder={t("admin.createOrg.adminNamePlaceholder")}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        aria-invalid={Boolean(fieldState.error)}
                      />
                      {fieldState.error && (
                        <p className="text-xs text-destructive">{t("admin.createOrg.adminNameMin")}</p>
                      )}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-admin-email">{t("admin.createOrg.adminEmail")}</Label>
                <Controller
                  control={form.control}
                  name="adminEmail"
                  render={({ field, fieldState }) => (
                    <div className="space-y-1">
                      <Input
                        id="co-admin-email"
                        type="email"
                        inputMode="email"
                        placeholder={t("admin.createOrg.adminEmailPlaceholder")}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                        onBlur={field.onBlur}
                        aria-invalid={Boolean(fieldState.error)}
                      />
                      {fieldState.error && (
                        <p className="text-xs text-destructive">
                          {fieldState.error.type === "too_small"
                            ? t("admin.createOrg.adminEmailTaken")
                            : t("admin.createOrg.adminEmailInvalid")}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-admin-password">{t("admin.createOrg.adminPassword")}</Label>
                <Controller
                  control={form.control}
                  name="adminPassword"
                  render={({ field, fieldState }) => (
                    <div className="space-y-1">
                      <div className="relative">
                        <Input
                          id="co-admin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t("admin.createOrg.adminPasswordPlaceholder")}
                          className="pr-10"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          aria-invalid={Boolean(fieldState.error)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={showPassword ? t("admin.createOrg.hidePassword") : t("admin.createOrg.showPassword")}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                        </button>
                      </div>
                      {fieldState.error && (
                        <p className="text-xs text-destructive">{t("admin.createOrg.adminPasswordMin")}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
          )}

          {/* ── Step 4: review ── */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{t("admin.createOrg.reviewTitle")}</p>
              <Card className="divide-y divide-border">
                <div className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="text-muted-foreground">{t("admin.createOrg.reviewOrg")}</span>
                  <span className="max-w-55 truncate font-medium" title={name}>{name}</span>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="text-muted-foreground">{t("admin.createOrg.reviewSubdomain")}</span>
                  <span className="truncate font-mono text-xs">{subdomain}.peopleflow.com</span>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="text-muted-foreground">{t("admin.createOrg.reviewPlan")}</span>
                  <span className="font-medium">
                    {lang === "bn" ? plan.nameBn : plan.nameEn} ·{" "}
                    {formatBdt(plan.priceBdt, lang)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="text-muted-foreground">{t("admin.createOrg.reviewAdmin")}</span>
                  <span className="max-w-55 truncate font-medium" title={`${adminName} (${adminEmail})`}>
                    {adminName} · {adminEmail}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="text-muted-foreground">{t("admin.createOrg.reviewPrice")}</span>
                  <span className="font-semibold text-primary tabular-nums">
                    {formatBdt(plan.priceBdt, lang)}
                    {t("admin.createOrg.planPerMonth")}
                  </span>
                </div>
              </Card>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t("admin.plans.includes")}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {planFeatures.map((f) => (
                    <li
                      key={f.key}
                      className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      <Check className="h-3 w-3 text-success" aria-hidden />
                      {lang === "bn" ? f.nameBn : f.nameEn}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
