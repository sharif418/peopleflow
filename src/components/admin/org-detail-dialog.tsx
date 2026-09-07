"use client"

// OrgDetailDialog — tabs (overview / features / plan / danger) + provisioning poll + impersonation
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Ban,
  CalendarDays,
  CircleUserRound,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  LogIn,
  PackageCheck,
  PlayCircle,
  Trash2,
  Users,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { apiFetch } from "@/lib/fetcher"
import { useI18n } from "@/lib/i18n"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/session"
import { formatBdt, formatDate, formatNumber } from "@/lib/format"
import { FEATURE_CATEGORY_LABELS, FEATURES, PLANS, PLAN_MAP } from "@/lib/features"
import { cn } from "@/lib/utils"
import { OrgStatusBadge, PlanBadge } from "./badges"
import { ProvisionProgress } from "./provision-progress"
import type { FeatureCategory } from "@/lib/features"
import type { OrgDetailResponse } from "./types"

const CATEGORY_ORDER: FeatureCategory[] = ["hr", "finance", "operations"]

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Globe
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <span className="min-w-0 truncate text-right text-sm font-medium">{children}</span>
    </div>
  )
}

export function OrgDetailDialog({
  orgId,
  onClose,
}: {
  orgId: string
  onClose: () => void
}) {
  const router = useRouter()
  const { t, lang } = useI18n()
  const queryClient = useQueryClient()
  const [confirmAction, setConfirmAction] = useState<"plan" | "suspend" | "activate" | "delete" | null>(null)
  const [pendingPlanKey, setPendingPlanKey] = useState<string | null>(null)
  const [impersonating, setImpersonating] = useState(false)
  const prevStatusRef = useRef<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "org", orgId],
    queryFn: () => apiFetch<OrgDetailResponse>(`/api/admin/organizations/${orgId}`),
    // Poll every 1.5s while the simulated ERPNext provisioning runs
    refetchInterval: (query) =>
      query.state.data?.org.status === "provisioning" ? 1500 : false,
  })

  // Toast when provisioning completes
  useEffect(() => {
    const status = data?.org.status
    if (status === "active" && prevStatusRef.current === "provisioning") {
      toast.success(t("admin.orgDetail.provisionDone"), {
        description: data?.org.name,
      })
    }
    if (status) prevStatusRef.current = status
  }, [data?.org.status, data?.org.name, t])

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ["admin"] })

  const patchMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void invalidateAll()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/admin/organizations/${orgId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("admin.orgDetail.deleted"))
      void invalidateAll()
      onClose()
    },
    onError: (err: Error) => {
      toast.error(t("admin.orgDetail.deleteFailed"), { description: err.message })
    },
  })

  // Optimistic feature-flag toggle
  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    const feature = FEATURES.find((f) => f.key === featureKey)
    const name = feature ? (lang === "bn" ? feature.nameBn : feature.nameEn) : featureKey
    const queryKey = ["admin", "org", orgId]
    // optimistic cache update
    queryClient.setQueryData<OrgDetailResponse>(queryKey, (prev) =>
      prev ? { ...prev, featureFlags: { ...prev.featureFlags, [featureKey]: enabled } } : prev,
    )
    try {
      await apiFetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        body: JSON.stringify({ featureFlags: [{ featureKey, enabled }] }),
      })
      toast.success(
        enabled
          ? t("admin.orgDetail.featureEnabled", { name })
          : t("admin.orgDetail.featureDisabled", { name }),
      )
      void queryClient.invalidateQueries({ queryKey })
      void invalidateAll()
    } catch (err) {
      // rollback
      queryClient.setQueryData<OrgDetailResponse>(queryKey, (prev) =>
        prev ? { ...prev, featureFlags: { ...prev.featureFlags, [featureKey]: !enabled } } : prev,
      )
      toast.error(t("admin.orgDetail.featureToggleFailed"), {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const doImpersonate = async () => {
    setImpersonating(true)
    try {
      await apiFetch("/api/auth/impersonate", {
        method: "POST",
        body: JSON.stringify({ orgId }),
      })
      await useSessionStore.getState().refresh()
      // Route into the impersonated org's portal
      const orgCtx = useSessionStore.getState().org
      const key = orgCtx?.subdomain || orgCtx?.id || orgId
      router.push(`/portal/${key}`)
    } catch (err) {
      toast.error(t("admin.orgDetail.impersonateFailed"), {
        description: err instanceof Error ? err.message : undefined,
      })
      setImpersonating(false)
    }
  }

  const org = data?.org
  const plan = org ? PLAN_MAP[org.planKey] : undefined
  const statusActive = org?.status === "active"

  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto sm:max-w-2xl pf-scrollbar">
        {isLoading || !data || !org ? (
          <div className="space-y-4 p-1">
            <DialogHeader>
              <DialogTitle className="sr-only">{t("admin.orgDetail.title")}</DialogTitle>
              <DialogDescription className="sr-only">{t("admin.orgDetail.loadFailed")}</DialogDescription>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </DialogHeader>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            {isError && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => void refetch()}>
                  {t("admin.common.retry")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <DialogHeader className="pb-4">
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0">
                  <DialogTitle className="truncate">{org.name}</DialogTitle>
                  <DialogDescription className="mt-0.5 font-mono text-xs">
                    {org.subdomain}.peopleflow.com
                  </DialogDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <OrgStatusBadge status={org.status} />
                    <PlanBadge planKey={org.planKey} />
                  </div>
                </div>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1.5"
                          disabled={!statusActive || impersonating}
                          onClick={() => void doImpersonate()}
                        >
                          {impersonating ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <LogIn className="h-4 w-4" aria-hidden />
                          )}
                          <span className="hidden sm:inline">{t("admin.orgDetail.impersonate")}</span>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{statusActive ? t("admin.orgDetail.impersonate") : t("admin.orgDetail.impersonateHint")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </DialogHeader>

            <Tabs defaultValue="overview">
              <TabsList className="grid h-10 w-full grid-cols-4">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">
                  {t("admin.orgDetail.tabOverview")}
                </TabsTrigger>
                <TabsTrigger value="features" className="text-xs sm:text-sm">
                  {t("admin.orgDetail.tabFeatures")}
                </TabsTrigger>
                <TabsTrigger value="plan" className="text-xs sm:text-sm">
                  {t("admin.orgDetail.tabPlan")}
                </TabsTrigger>
                <TabsTrigger value="danger" className="text-xs sm:text-sm">
                  {t("admin.orgDetail.tabDanger")}
                </TabsTrigger>
              </TabsList>

              {/* ── Overview tab ── */}
              <TabsContent value="overview" className="mt-4 space-y-4">
                {org.status !== "active" && <ProvisionProgress provision={data.provision} />}

                <Card className="border-border/80 shadow-xs">
                  <CardContent className="divide-y divide-border/70 p-0 sm:grid sm:grid-cols-2 sm:divide-x">
                    <div className="px-4">
                      <InfoRow icon={Globe} label={t("admin.orgDetail.site")}>
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                          {org.siteName ?? `${org.subdomain}.peopleflow.com`}
                        </span>
                      </InfoRow>
                      <div className="border-t border-border/70" />
                      <InfoRow icon={Info} label={t("admin.orgDetail.subdomain")}>
                        <span className="font-mono text-xs">{org.subdomain}</span>
                      </InfoRow>
                      <div className="border-t border-border/70" />
                      <InfoRow icon={PackageCheck} label={t("admin.orgDetail.plan")}>
                        {lang === "bn" ? plan?.nameBn : plan?.nameEn} ·{" "}
                        <span className="tabular-nums">{formatBdt(org.mrr, lang)}</span>
                      </InfoRow>
                      <div className="border-t border-border/70" />
                      <InfoRow icon={CalendarDays} label={t("admin.orgDetail.created")}>
                        {formatDate(org.createdAt, lang)}
                      </InfoRow>
                    </div>
                    <div className="border-t border-border/70 sm:border-t-0">
                      <InfoRow icon={CircleUserRound} label={t("admin.orgDetail.adminUser")}>
                        {data.adminUser ? (
                          <span className="truncate" title={`${data.adminUser.name} (${data.adminUser.email})`}>
                            {data.adminUser.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </InfoRow>
                      <div className="border-t border-border/70" />
                      <InfoRow icon={Users} label={t("admin.orgDetail.employees")}>
                        <span className="tabular-nums">
                          {formatNumber(data.employeesCount, lang)} {t("admin.common.people")}
                        </span>
                      </InfoRow>
                      <div className="border-t border-border/70" />
                      <InfoRow icon={PackageCheck} label={t("admin.orgDetail.setup")}>
                        <span className={org.setupCompleted ? "text-success" : "text-warning"}>
                          {org.setupCompleted ? t("admin.orgDetail.setupDone") : t("admin.orgDetail.setupPending")}
                        </span>
                      </InfoRow>
                      <div className="border-t border-border/70" />
                      <InfoRow icon={CalendarDays} label={t("admin.orgDetail.monthlyBill")}>
                        <span className="tabular-nums">{formatBdt(plan?.priceBdt ?? 0, lang)}</span>
                      </InfoRow>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Features tab ── */}
              <TabsContent value="features" className="mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">{t("admin.orgDetail.featuresTitle")}</h3>
                  <p className="text-xs text-muted-foreground">{t("admin.orgDetail.featuresDesc")}</p>
                </div>
                {CATEGORY_ORDER.map((category) => {
                  const features = FEATURES.filter((f) => f.category === category)
                  return (
                    <Card key={category} className="border-border/80 shadow-xs">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {lang === "bn"
                            ? FEATURE_CATEGORY_LABELS[category].bn
                            : FEATURE_CATEGORY_LABELS[category].en}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="divide-y divide-border/60 py-0">
                        {features.map((feature) => {
                          const enabled = data.featureFlags[feature.key] ?? false
                          const locked = feature.key === "hr_core"
                          return (
                            <div key={feature.key} className="flex items-center gap-3 py-3">
                              <span
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                  enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                                )}
                              >
                                <feature.icon className="h-4.5 w-4.5" aria-hidden />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {lang === "bn" ? feature.nameBn : feature.nameEn}
                                  {locked && (
                                    <span className="ml-2 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                                      {t("admin.orgDetail.alwaysOn")}
                                    </span>
                                  )}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {lang === "bn" ? feature.descBn : feature.descEn}
                                </p>
                              </div>
                              <Switch
                                checked={locked ? true : enabled}
                                disabled={locked || patchMutation.isPending}
                                onCheckedChange={(checked) => void toggleFeature(feature.key, checked)}
                                aria-label={lang === "bn" ? feature.nameBn : feature.nameEn}
                              />
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  )
                })}
              </TabsContent>

              {/* ── Plan tab ── */}
              <TabsContent value="plan" className="mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">{t("admin.orgDetail.planTitle")}</h3>
                  <p className="text-xs text-muted-foreground">{t("admin.orgDetail.planDesc")}</p>
                </div>
                <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
                  {PLANS.map((p) => {
                    const selected = pendingPlanKey ?? org.planKey
                    const isCurrent = p.key === selected
                    return (
                      <button
                        key={p.key}
                        type="button"
                        role="radio"
                        aria-checked={isCurrent}
                        onClick={() => setPendingPlanKey(p.key)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-all",
                          isCurrent
                            ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                            : "border-border/80 hover:border-primary/40 hover:shadow-xs",
                        )}
                      >
                        <p className="text-sm font-semibold">{lang === "bn" ? p.nameBn : p.nameEn}</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-primary">
                          {formatBdt(p.priceBdt, lang)}
                          <span className="text-xs font-normal text-muted-foreground">
                            {t("admin.plans.perMonth")}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.maxEmployees === -1
                            ? t("admin.plans.unlimited")
                            : t("admin.plans.employeesUpTo", { max: p.maxEmployees })}
                        </p>
                      </button>
                    )
                  })}
                </div>
                <Button
                  className="w-full sm:w-auto"
                  disabled={pendingPlanKey === null || pendingPlanKey === org.planKey || patchMutation.isPending}
                  onClick={() => setConfirmAction("plan")}
                >
                  {patchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {t("admin.orgDetail.applyPlan")}
                </Button>
              </TabsContent>

              {/* ── Danger tab ── */}
              <TabsContent value="danger" className="mt-4 space-y-4">
                <Card className="border-destructive/30 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                      <Ban className="h-4 w-4" aria-hidden />
                      {statusActive ? t("admin.orgDetail.suspend") : t("admin.orgDetail.activate")}
                    </CardTitle>
                    <CardDescription>
                      {statusActive
                        ? t("admin.orgDetail.suspendConfirmDesc", { name: org.name })
                        : t("admin.orgDetail.activateConfirmDesc", { name: org.name })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant={statusActive ? "outline" : "default"}
                      className="gap-1.5"
                      onClick={() => setConfirmAction(statusActive ? "suspend" : "activate")}
                      disabled={patchMutation.isPending}
                    >
                      {statusActive ? (
                        <Ban className="h-4 w-4" aria-hidden />
                      ) : (
                        <PlayCircle className="h-4 w-4" aria-hidden />
                      )}
                      {statusActive ? t("admin.orgDetail.suspend") : t("admin.orgDetail.activate")}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-destructive/50 bg-destructive/5 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {t("admin.orgDetail.delete")}
                    </CardTitle>
                    <CardDescription>{t("admin.orgDetail.deleteConfirmDesc", { name: org.name })}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="destructive" className="gap-1.5" onClick={() => setConfirmAction("delete")} disabled={deleteMutation.isPending}>
                      {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {t("admin.orgDetail.delete")}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* ── Confirm dialogs ── */}
        <ConfirmDialog
          open={confirmAction === "plan"}
          onOpenChange={(next) => (next ? null : setConfirmAction(null))}
          title={t("admin.orgDetail.applyPlanConfirmTitle")}
          description={t("admin.orgDetail.applyPlanConfirmDesc", {
            plan: lang === "bn" ? (PLAN_MAP[pendingPlanKey ?? ""]?.nameBn ?? "") : (PLAN_MAP[pendingPlanKey ?? ""]?.nameEn ?? ""),
          })}
          confirmLabel={t("admin.orgDetail.applyPlan")}
          cancelLabel={t("common.cancel")}
          destructive={false}
          onConfirm={() => {
            if (pendingPlanKey) {
              patchMutation.mutate(
                { planKey: pendingPlanKey },
                {
                  onSuccess: () => {
                    toast.success(t("admin.orgDetail.planChanged"))
                    setPendingPlanKey(null)
                  },
                  onError: () => toast.error(t("admin.orgDetail.planChangeFailed")),
                },
              )
            }
            setConfirmAction(null)
          }}
        />
        <ConfirmDialog
          open={confirmAction === "suspend"}
          onOpenChange={(next) => (next ? null : setConfirmAction(null))}
          title={t("admin.orgDetail.suspendConfirmTitle")}
          description={t("admin.orgDetail.suspendConfirmDesc", { name: org?.name ?? "" })}
          confirmLabel={t("admin.orgDetail.suspend")}
          cancelLabel={t("common.cancel")}
          onConfirm={() => {
            patchMutation.mutate(
              { status: "suspended" },
              {
                onSuccess: () => toast.success(t("admin.orgDetail.suspended")),
                onError: () => toast.error(t("admin.orgDetail.statusFailed")),
              },
            )
            setConfirmAction(null)
          }}
        />
        <ConfirmDialog
          open={confirmAction === "activate"}
          onOpenChange={(next) => (next ? null : setConfirmAction(null))}
          title={t("admin.orgDetail.activateConfirmTitle")}
          description={t("admin.orgDetail.activateConfirmDesc", { name: org?.name ?? "" })}
          confirmLabel={t("admin.orgDetail.activate")}
          cancelLabel={t("common.cancel")}
          destructive={false}
          onConfirm={() => {
            patchMutation.mutate(
              { status: "active" },
              {
                onSuccess: () => toast.success(t("admin.orgDetail.activated")),
                onError: () => toast.error(t("admin.orgDetail.statusFailed")),
              },
            )
            setConfirmAction(null)
          }}
        />
        <ConfirmDialog
          open={confirmAction === "delete"}
          onOpenChange={(next) => (next ? null : setConfirmAction(null))}
          title={t("admin.orgDetail.deleteConfirmTitle")}
          description={t("admin.orgDetail.deleteConfirmDesc", { name: org?.name ?? "" })}
          confirmLabel={t("admin.orgDetail.delete")}
          cancelLabel={t("common.cancel")}
          onConfirm={() => {
            setConfirmAction(null)
            deleteMutation.mutate()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
