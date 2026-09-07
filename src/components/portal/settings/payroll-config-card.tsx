"use client"

// Payroll config card — provident fund enable switch + percent slider.
import { useState } from "react"
import { motion } from "framer-motion"
import { Info, PiggyBank } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { toBnDigits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { SaveFooter } from "./save-footer"
import { useSettingsSave } from "./use-settings-save"
import type { OrgSettingsData } from "../payroll/types"

export function PayrollConfigCard({ initial }: { initial: OrgSettingsData }) {
  const { lang, t } = useI18n()
  const [pfEnabled, setPfEnabled] = useState(initial.pfEnabled)
  const [pfPercent, setPfPercent] = useState(initial.pfPercent)
  const saveMutation = useSettingsSave(t)

  const dirty = pfEnabled !== initial.pfEnabled || pfPercent !== initial.pfPercent

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
      <Card className="h-full border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="size-4 text-primary" aria-hidden />
            {t("portal.settings.payrollTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("portal.settings.payrollDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("portal.settings.pfTitle")}</p>
              <p className="max-w-[26ch] text-xs leading-relaxed text-muted-foreground sm:max-w-none">
                {t("portal.settings.pfDesc")}
              </p>
            </div>
            <Switch
              checked={pfEnabled}
              onCheckedChange={setPfEnabled}
              aria-label={t("portal.settings.pfTitle")}
            />
          </div>

          <div className={cn("space-y-3 transition-opacity", !pfEnabled && "opacity-50")}>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t("portal.settings.pfPercentLabel")}</Label>
              <span className="font-mono text-2xl font-bold tabular-nums text-primary">
                {lang === "bn" ? toBnDigits(pfPercent) : pfPercent}
                {t("portal.settings.pfPercentUnit")}
              </span>
            </div>
            <Slider
              value={[pfPercent]}
              min={0}
              max={30}
              step={1}
              disabled={!pfEnabled}
              aria-label={t("portal.settings.pfPercentLabel")}
              onValueChange={(v) => setPfPercent(v[0] ?? pfPercent)}
            />
            <p className="text-[11px] text-muted-foreground">{t("portal.settings.pfPercentHint")}</p>
          </div>

          <p className="flex items-start gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-[11px] text-primary/90">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("portal.settings.pfNote")}
          </p>

          <SaveFooter
            dirty={dirty}
            saving={saveMutation.isPending}
            t={t}
            onSave={() => saveMutation.mutate({ pfEnabled, pfPercent })}
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}
