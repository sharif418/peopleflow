"use client"

// Shared card footer — unchanged hint + save button with pending spinner.
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SaveFooter({
  dirty,
  saving,
  onSave,
  t,
}: {
  dirty: boolean
  saving: boolean
  onSave: () => void
  t: (k: string) => string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
      <p className="text-[11px] text-muted-foreground" aria-live="polite">
        {dirty ? "•" : t("portal.settings.unchangedHint")}
      </p>
      <Button className="h-10" disabled={!dirty || saving} onClick={onSave}>
        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
        {saving ? t("portal.settings.saving") : t("portal.settings.save")}
      </Button>
    </div>
  )
}
