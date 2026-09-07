"use client"

// Attendance module — device sync mutation + simulated progress phases
import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { ATT_ENDPOINTS, type SyncResult } from "./attendance-types"

export interface SyncVars {
  deviceId?: string
  date?: string
  mode?: "full" | "missing"
}

/** Shared device-sync mutation: toast on result + invalidate attendance & overview caches. */
export function useDeviceSync() {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vars: SyncVars) =>
      apiFetch<SyncResult>(ATT_ENDPOINTS.sync, { method: "POST", body: JSON.stringify(vars) }),
    onSuccess: (res) => {
      toast.success(
        res.syncedCount > 0
          ? t("portal.attendance.sync.toastSuccess", { n: formatNumber(res.syncedCount, lang) })
          : t("portal.attendance.sync.toastNone"),
      )
      void queryClient.invalidateQueries({ queryKey: ["org", "attendance"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "overview"] })
    },
    onError: (err: Error) => {
      toast.error(
        err.message === "no_device"
          ? t("portal.attendance.sync.noDevice")
          : t("portal.attendance.sync.failed"),
      )
    },
  })
}

const PHASE_KEYS = [
  "portal.attendance.sync.connect",
  "portal.attendance.sync.reading",
  "portal.attendance.sync.saving",
]

/** Rotating status line while a sync runs: connecting → reading → saving. */
export function useSyncPhase(active: boolean): string {
  const { t } = useI18n()
  const [phase, setPhase] = useState(0)
  const [prevActive, setPrevActive] = useState(active)

  // reset the phase whenever a new sync kicks off (adjust-state-during-render)
  if (active !== prevActive) {
    setPrevActive(active)
    if (active) setPhase(0)
  }

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setPhase((p) => Math.min(p + 1, PHASE_KEYS.length - 1))
    }, 450)
    return () => clearInterval(id)
  }, [active])

  return t(PHASE_KEYS[phase])
}
