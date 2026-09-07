"use client"

import { useI18n } from "@/lib/i18n"
import { PeopleFlowLogo } from "./peopleflow-logo"

export function AppFooter() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-col items-center gap-1.5 sm:items-start">
            <PeopleFlowLogo markClassName="h-6 w-6" className="text-sm" />
            <p className="text-xs text-muted-foreground">{t("landing.footerRights").replace("২০২৫", String(year))}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t("landing.footerMadeIn")}</span>
            <span aria-hidden>·</span>
            <span>ERPNext + Next.js</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
