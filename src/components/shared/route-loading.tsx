"use client"

// Route-level loading fallback — centered brand spinner
import { PeopleFlowMark } from "@/components/shared/peopleflow-logo"
import { useI18n } from "@/lib/i18n"

export function RouteLoading() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4">
      <PeopleFlowMark className="h-12 w-12 animate-pulse" />
      <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
    </div>
  )
}
