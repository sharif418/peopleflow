"use client"

// OrgDetailDialog shell — tabs (overview / features / plan / danger) +
// provisioning poll + impersonation. Tab contents, info card and confirm
// dialogs live in co-located org-detail-* files.
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, LogIn } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { apiFetch } from "@/lib/fetcher"
import { useI18n } from "@/lib/i18n"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/session"
import { FEATURES } from "@/lib/features"
import { OrgStatusBadge, PlanBadge } from "./badges"
import { ProvisionProgress } from "./provision-progress"
import { OrgDetailInfoCard } from "./org-detail-info-card"
import { OrgDetailFeaturesTab } from "./org-detail-features-tab"
import { OrgDetailPlanTab } from "./org-detail-plan-tab"
import { OrgDetailDangerTab } from "./org-detail-danger-tab"
import { OrgDetailConfirmDialogs, type OrgConfirmAction } from "./org-detail-confirm-dialogs"
import type { OrgDetailResponse } from "./types"

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
  const [confirmAction, setConfirmAction] = useState<OrgConfirmAction>(null)
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
                <OrgDetailInfoCard data={data} />
              </TabsContent>

              {/* ── Features tab ── */}
              <TabsContent value="features" className="mt-4 space-y-4">
                <OrgDetailFeaturesTab
                  featureFlags={data.featureFlags}
                  onToggle={(featureKey, enabled) => void toggleFeature(featureKey, enabled)}
                  disabled={patchMutation.isPending}
                />
              </TabsContent>

              {/* ── Plan tab ── */}
              <TabsContent value="plan" className="mt-4 space-y-4">
                <OrgDetailPlanTab
                  currentPlanKey={org.planKey}
                  pendingPlanKey={pendingPlanKey}
                  onSelect={setPendingPlanKey}
                  onApply={() => setConfirmAction("plan")}
                  isPending={patchMutation.isPending}
                />
              </TabsContent>

              {/* ── Danger tab ── */}
              <TabsContent value="danger" className="mt-4 space-y-4">
                <OrgDetailDangerTab
                  orgName={org.name}
                  statusActive={statusActive}
                  patchPending={patchMutation.isPending}
                  deletePending={deleteMutation.isPending}
                  onStatusAction={() => setConfirmAction(statusActive ? "suspend" : "activate")}
                  onDelete={() => setConfirmAction("delete")}
                />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* ── Confirm dialogs ── */}
        <OrgDetailConfirmDialogs
          confirmAction={confirmAction}
          onClear={() => setConfirmAction(null)}
          orgName={org?.name ?? ""}
          pendingPlanKey={pendingPlanKey}
          onConfirmPlan={() => {
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
          onConfirmSuspend={() => {
            patchMutation.mutate(
              { status: "suspended" },
              {
                onSuccess: () => toast.success(t("admin.orgDetail.suspended")),
                onError: () => toast.error(t("admin.orgDetail.statusFailed")),
              },
            )
            setConfirmAction(null)
          }}
          onConfirmActivate={() => {
            patchMutation.mutate(
              { status: "active" },
              {
                onSuccess: () => toast.success(t("admin.orgDetail.activated")),
                onError: () => toast.error(t("admin.orgDetail.statusFailed")),
              },
            )
            setConfirmAction(null)
          }}
          onConfirmDelete={() => {
            setConfirmAction(null)
            deleteMutation.mutate()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
