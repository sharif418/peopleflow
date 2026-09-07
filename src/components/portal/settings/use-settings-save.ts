"use client"

// Shared settings PATCH mutation with per-section success toasts and
// field-specific validation error mapping. Used by all settings cards.
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "@/lib/fetcher"
import type { OrgSettingsData } from "../payroll/types"

export function useSettingsSave(t: (k: string) => string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<OrgSettingsData>("/api/org/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_res, payload) => {
      if ("weekendConfig" in payload) toast.success(t("portal.settings.workweekToast"))
      else if ("pfEnabled" in payload || "pfPercent" in payload)
        toast.success(t("portal.settings.payrollToast"))
      else toast.success(t("portal.settings.savedToast"))
      void queryClient.invalidateQueries({ queryKey: ["org", "settings"] })
    },
    onError: (err: Error) => {
      const msg = err.message
      if (msg.includes("contactPhone")) toast.error(t("portal.settings.errInvalidPhone"))
      else if (msg.includes("contactEmail")) toast.error(t("portal.settings.errInvalidEmail"))
      else toast.error(t("portal.settings.saveFailed"))
    },
  })
}
