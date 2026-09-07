"use client"

// Org detail confirm dialogs — plan change, suspend, activate and delete
// confirmations. Mutation logic lives in the parent (passed via callbacks).
import { useI18n } from "@/lib/i18n"
import { PLAN_MAP } from "@/lib/features"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

export type OrgConfirmAction = "plan" | "suspend" | "activate" | "delete" | null

export function OrgDetailConfirmDialogs({
  confirmAction,
  onClear,
  orgName,
  pendingPlanKey,
  onConfirmPlan,
  onConfirmSuspend,
  onConfirmActivate,
  onConfirmDelete,
}: {
  confirmAction: OrgConfirmAction
  onClear: () => void
  orgName: string
  pendingPlanKey: string | null
  onConfirmPlan: () => void
  onConfirmSuspend: () => void
  onConfirmActivate: () => void
  onConfirmDelete: () => void
}) {
  const { t, lang } = useI18n()

  return (
    <>
      <ConfirmDialog
        open={confirmAction === "plan"}
        onOpenChange={(next) => (next ? null : onClear())}
        title={t("admin.orgDetail.applyPlanConfirmTitle")}
        description={t("admin.orgDetail.applyPlanConfirmDesc", {
          plan: lang === "bn" ? (PLAN_MAP[pendingPlanKey ?? ""]?.nameBn ?? "") : (PLAN_MAP[pendingPlanKey ?? ""]?.nameEn ?? ""),
        })}
        confirmLabel={t("admin.orgDetail.applyPlan")}
        cancelLabel={t("common.cancel")}
        destructive={false}
        onConfirm={onConfirmPlan}
      />
      <ConfirmDialog
        open={confirmAction === "suspend"}
        onOpenChange={(next) => (next ? null : onClear())}
        title={t("admin.orgDetail.suspendConfirmTitle")}
        description={t("admin.orgDetail.suspendConfirmDesc", { name: orgName })}
        confirmLabel={t("admin.orgDetail.suspend")}
        cancelLabel={t("common.cancel")}
        onConfirm={onConfirmSuspend}
      />
      <ConfirmDialog
        open={confirmAction === "activate"}
        onOpenChange={(next) => (next ? null : onClear())}
        title={t("admin.orgDetail.activateConfirmTitle")}
        description={t("admin.orgDetail.activateConfirmDesc", { name: orgName })}
        confirmLabel={t("admin.orgDetail.activate")}
        cancelLabel={t("common.cancel")}
        destructive={false}
        onConfirm={onConfirmActivate}
      />
      <ConfirmDialog
        open={confirmAction === "delete"}
        onOpenChange={(next) => (next ? null : onClear())}
        title={t("admin.orgDetail.deleteConfirmTitle")}
        description={t("admin.orgDetail.deleteConfirmDesc", { name: orgName })}
        confirmLabel={t("admin.orgDetail.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={onConfirmDelete}
      />
    </>
  )
}
