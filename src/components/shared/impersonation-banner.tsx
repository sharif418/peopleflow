"use client"

import { useState } from "react"
import { ShieldAlert, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useSessionStore } from "@/store/session"
import { useI18n } from "@/lib/i18n"
import { useRouter } from "next/navigation"

export function ImpersonationBanner() {
  const { org, impersonating, refresh } = useSessionStore()
  const { t } = useI18n()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (!impersonating || !org) return null

  const exit = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/auth/exit-impersonate", { method: "POST" })
      const json = (await res.json()) as { ok: boolean }
      if (json.ok) {
        await refresh()
        toast.success(t("auth.impersonationExit") + " ✓")
        router.push("/admin")
        router.refresh()
      } else {
        toast.error(t("common.error"))
      }
    } catch {
      toast.error(t("common.error"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex w-full flex-wrap items-center justify-between gap-2 border-b border-warning/40 bg-warning/15 px-3 py-2 text-warning-foreground sm:px-4"
    >
      <div className="flex min-w-0 items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
        <p className="truncate text-xs font-medium sm:text-sm">
          {t("auth.impersonationViewing")} <strong className="font-semibold">{org.name}</strong>
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-warning/50 bg-background/60 text-xs hover:bg-warning/25"
        onClick={exit}
        disabled={busy}
      >
        <LogOut className="mr-1 h-3.5 w-3.5" aria-hidden />
        {t("auth.impersonationExit")}
      </Button>
    </div>
  )
}
