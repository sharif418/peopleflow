"use client"

// Wizard step 0 — welcome / org summary with the setup overview checklist.
import { Check } from "lucide-react"
import type { SessionOrg } from "@/lib/types"
import type { PlanDef } from "@/lib/features"
import { useI18n } from "@/lib/i18n"

export function WelcomeStep({ org, plan }: { org: SessionOrg | null; plan: PlanDef | null }) {
  const { t } = useI18n()

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t("portal.wizard.welcomeTitle")}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("portal.wizard.welcomeDesc")}</p>
      </div>
      {org && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("portal.wizard.yourOrg")}
          </p>
          <div className="mt-2 space-y-1.5 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("portal.wizard.orgName")}</span>
              <span className="truncate font-semibold">{org.name}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("portal.wizard.subdomain")}</span>
              <span className="font-mono text-xs font-medium">{org.subdomain}.peopleflow.com</span>
            </p>
            {plan && (
              <p className="flex justify-between gap-4">
                <span className="text-muted-foreground">{t("portal.wizard.plan")}</span>
                <span className="font-semibold">{plan.nameBn}</span>
              </p>
            )}
          </div>
        </div>
      )}
      <div>
        <p className="text-sm font-semibold">{t("portal.wizard.willSetup")}</p>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {[
            t("portal.wizard.willSetupDepts"),
            t("portal.wizard.willSetupDesigs"),
            t("portal.wizard.willSetupShifts"),
            t("portal.wizard.willSetupEmps"),
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
