"use client"

// Create-org wizard step 2 — plan selection radio cards with price, employee
// cap and top features.
import { Controller, type Control } from "react-hook-form"
import { Check } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt } from "@/lib/format"
import { FEATURES, PLANS } from "@/lib/features"
import { cn } from "@/lib/utils"
import type { CreateForm } from "./create-org-schema"

export function CreateOrgPlanStep({ control }: { control: Control<CreateForm> }) {
  const { t, lang } = useI18n()

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t("admin.createOrg.planSelect")}</p>
      <Controller
        control={control}
        name="planKey"
        render={({ field }) => (
          <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => {
              const selected = field.value === p.key
              const topFeatures = p.features.slice(0, 3)
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => field.onChange(p.key)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    selected
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                      : "border-border/80 hover:border-primary/40 hover:shadow-xs",
                  )}
                >
                  <p className="text-sm font-semibold">{lang === "bn" ? p.nameBn : p.nameEn}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-primary">
                    {formatBdt(p.priceBdt, lang)}
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("admin.createOrg.planPerMonth")}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.maxEmployees === -1
                      ? t("admin.createOrg.planUnlimited")
                      : t("admin.createOrg.planEmployees", { max: p.maxEmployees })}
                  </p>
                  <ul className="mt-2.5 space-y-1">
                    {topFeatures.map((fkey) => {
                      const f = FEATURES.find((x) => x.key === fkey)
                      if (!f) return null
                      return (
                        <li key={fkey} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 shrink-0 text-success" aria-hidden />
                          <span className="truncate">{lang === "bn" ? f.nameBn : f.nameEn}</span>
                        </li>
                      )
                    })}
                  </ul>
                </button>
              )
            })}
          </div>
        )}
      />
    </div>
  )
}
