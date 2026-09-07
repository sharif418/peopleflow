"use client"

// Workweek card — weekend day toggle grid with legend and save footer.
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { CalendarDays, CheckCircle2, Circle } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SaveFooter } from "./save-footer"
import { useSettingsSave } from "./use-settings-save"
import type { OrgSettingsData } from "../payroll/types"

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const

function dayLabel(key: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    sunday: t("portal.settings.daySunday"),
    monday: t("portal.settings.dayMonday"),
    tuesday: t("portal.settings.dayTuesday"),
    wednesday: t("portal.settings.dayWednesday"),
    thursday: t("portal.settings.dayThursday"),
    friday: t("portal.settings.dayFriday"),
    saturday: t("portal.settings.daySaturday"),
  }
  return map[key] ?? key
}

export function WorkweekCard({ initial }: { initial: OrgSettingsData }) {
  const { t } = useI18n()
  const [weekend, setWeekend] = useState<string[]>(initial.weekendConfig)
  const saveMutation = useSettingsSave(t)

  const dirty = useMemo(() => {
    const a = [...weekend].sort()
    const b = [...initial.weekendConfig].sort()
    return a.join(",") !== b.join(",")
  }, [initial, weekend])

  const toggleDay = (day: string) => {
    setWeekend((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
      <Card className="h-full border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-primary" aria-hidden />
            {t("portal.settings.workweekTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("portal.settings.workweekDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4">
            {DAY_KEYS.map((day) => {
              const isWeekend = weekend.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  role="switch"
                  aria-checked={isWeekend}
                  aria-label={`${dayLabel(day, t)} — ${
                    isWeekend ? t("portal.settings.weekendLabel") : t("portal.settings.workdayLabel")
                  }`}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isWeekend
                      ? "border-muted-foreground/25 bg-muted text-muted-foreground"
                      : "border-primary/30 bg-primary/10 text-primary",
                  )}
                >
                  <span className="text-xs font-semibold">{dayLabel(day, t)}</span>
                  {isWeekend ? (
                    <Circle className="size-3 opacity-60" aria-hidden />
                  ) : (
                    <CheckCircle2 className="size-3" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-primary/40 bg-primary/15" aria-hidden />
              {t("portal.settings.workdayLabel")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-muted-foreground/30 bg-muted" aria-hidden />
              {t("portal.settings.weekendLabel")}
            </span>
          </div>
          <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            {t("portal.settings.workweekHint")}
          </p>
          <SaveFooter
            dirty={dirty}
            saving={saveMutation.isPending}
            t={t}
            onSave={() => saveMutation.mutate({ weekendConfig: weekend })}
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}
