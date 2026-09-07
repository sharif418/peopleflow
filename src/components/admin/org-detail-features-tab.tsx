"use client"

// Org detail features tab — feature flag switches grouped by category, with the
// hr_core always-on lock and optimistic toggles (handled by the parent).
import { useI18n } from "@/lib/i18n"
import { FEATURE_CATEGORY_LABELS, FEATURES } from "@/lib/features"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { FeatureCategory } from "@/lib/features"

const CATEGORY_ORDER: FeatureCategory[] = ["hr", "finance", "operations"]

export function OrgDetailFeaturesTab({
  featureFlags,
  onToggle,
  disabled,
}: {
  featureFlags: Record<string, boolean>
  onToggle: (featureKey: string, enabled: boolean) => void
  disabled: boolean
}) {
  const { t, lang } = useI18n()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{t("admin.orgDetail.featuresTitle")}</h3>
        <p className="text-xs text-muted-foreground">{t("admin.orgDetail.featuresDesc")}</p>
      </div>
      {CATEGORY_ORDER.map((category) => {
        const features = FEATURES.filter((f) => f.category === category)
        return (
          <Card key={category} className="border-border/80 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {lang === "bn"
                  ? FEATURE_CATEGORY_LABELS[category].bn
                  : FEATURE_CATEGORY_LABELS[category].en}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 py-0">
              {features.map((feature) => {
                const enabled = featureFlags[feature.key] ?? false
                const locked = feature.key === "hr_core"
                return (
                  <div key={feature.key} className="flex items-center gap-3 py-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <feature.icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {lang === "bn" ? feature.nameBn : feature.nameEn}
                        {locked && (
                          <span className="ml-2 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                            {t("admin.orgDetail.alwaysOn")}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lang === "bn" ? feature.descBn : feature.descEn}
                      </p>
                    </div>
                    <Switch
                      checked={locked ? true : enabled}
                      disabled={locked || disabled}
                      onCheckedChange={(checked) => onToggle(feature.key, checked)}
                      aria-label={lang === "bn" ? feature.nameBn : feature.nameEn}
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
