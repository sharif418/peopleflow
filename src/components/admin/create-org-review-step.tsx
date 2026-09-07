"use client"

// Create-org wizard step 4 — review summary card + included features chips.
import { Check } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt } from "@/lib/format"
import { type FeatureDef, type PlanDef } from "@/lib/features"
import { Card } from "@/components/ui/card"

export function CreateOrgReviewStep({
  name,
  subdomain,
  plan,
  adminName,
  adminEmail,
  planFeatures,
}: {
  name: string
  subdomain: string
  plan: PlanDef
  adminName: string
  adminEmail: string
  planFeatures: FeatureDef[]
}) {
  const { t, lang } = useI18n()

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t("admin.createOrg.reviewTitle")}</p>
      <Card className="divide-y divide-border">
        <div className="flex items-center justify-between gap-3 p-3 text-sm">
          <span className="text-muted-foreground">{t("admin.createOrg.reviewOrg")}</span>
          <span className="max-w-55 truncate font-medium" title={name}>{name}</span>
        </div>
        <div className="flex items-center justify-between gap-3 p-3 text-sm">
          <span className="text-muted-foreground">{t("admin.createOrg.reviewSubdomain")}</span>
          <span className="truncate font-mono text-xs">{subdomain}.peopleflow.com</span>
        </div>
        <div className="flex items-center justify-between gap-3 p-3 text-sm">
          <span className="text-muted-foreground">{t("admin.createOrg.reviewPlan")}</span>
          <span className="font-medium">
            {lang === "bn" ? plan.nameBn : plan.nameEn} ·{" "}
            {formatBdt(plan.priceBdt, lang)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 p-3 text-sm">
          <span className="text-muted-foreground">{t("admin.createOrg.reviewAdmin")}</span>
          <span className="max-w-55 truncate font-medium" title={`${adminName} (${adminEmail})`}>
            {adminName} · {adminEmail}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 p-3 text-sm">
          <span className="text-muted-foreground">{t("admin.createOrg.reviewPrice")}</span>
          <span className="font-semibold text-primary tabular-nums">
            {formatBdt(plan.priceBdt, lang)}
            {t("admin.createOrg.planPerMonth")}
          </span>
        </div>
      </Card>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{t("admin.plans.includes")}</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {planFeatures.map((f) => (
            <li
              key={f.key}
              className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <Check className="h-3 w-3 text-success" aria-hidden />
              {lang === "bn" ? f.nameBn : f.nameEn}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
