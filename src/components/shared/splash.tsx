"use client"

import { PeopleFlowMark } from "./peopleflow-logo"
import { useI18n } from "@/lib/i18n"

export function Splash() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <PeopleFlowMark className="h-14 w-14 animate-pulse" />
      <p className="text-sm text-muted-foreground">{t("auth.splash")}</p>
    </div>
  )
}
