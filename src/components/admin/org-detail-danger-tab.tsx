"use client"

// Org detail danger tab — suspend/activate and delete org cards. Both actions
// open the parent's confirm dialogs; mutations live in the parent.
import { Ban, Loader2, PlayCircle, Trash2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function OrgDetailDangerTab({
  orgName,
  statusActive,
  patchPending,
  deletePending,
  onStatusAction,
  onDelete,
}: {
  orgName: string
  statusActive: boolean
  patchPending: boolean
  deletePending: boolean
  onStatusAction: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <Card className="border-destructive/30 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <Ban className="h-4 w-4" aria-hidden />
            {statusActive ? t("admin.orgDetail.suspend") : t("admin.orgDetail.activate")}
          </CardTitle>
          <CardDescription>
            {statusActive
              ? t("admin.orgDetail.suspendConfirmDesc", { name: orgName })
              : t("admin.orgDetail.activateConfirmDesc", { name: orgName })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant={statusActive ? "outline" : "default"}
            className="gap-1.5"
            onClick={onStatusAction}
            disabled={patchPending}
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
          <CardDescription>{t("admin.orgDetail.deleteConfirmDesc", { name: orgName })}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="gap-1.5" onClick={onDelete} disabled={deletePending}>
            {deletePending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("admin.orgDetail.delete")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
