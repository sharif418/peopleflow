"use client"

// Goal progress dialog — update the current value with a slider + number
// input, live before/after progress bars, auto-complete hint at 100%.
import { useMemo, useState } from "react"
import { Loader2, TrendingUp } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import type { Lang } from "@/lib/types"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import type { GoalRow } from "./types"
import { formatGoalValue, progressColorClass } from "./utils"

function progressOf(goal: GoalRow, value: number): number {
  if (goal.targetValue <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / goal.targetValue) * 100)))
}

function ProgressBar({ percent, label, lang }: { percent: number; label: string; lang: Lang }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{formatNumber(percent, lang)}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-all", progressColorClass(percent))}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function GoalProgressDialog({
  open,
  onOpenChange,
  goal,
  busy,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: GoalRow
  busy: boolean
  onSubmit: (currentValue: number) => void
}) {
  const { lang, t } = useI18n()
  // Seeded at mount — the parent keys this dialog by goal.id + currentValue.
  const [value, setValue] = useState<number>(goal.currentValue)

  const sliderMax = useMemo(
    () => Math.max(goal.targetValue, goal.currentValue),
    [goal.targetValue, goal.currentValue],
  )
  const beforePercent = progressOf(goal, goal.currentValue)
  const afterPercent = progressOf(goal, value)
  const willComplete = goal.targetValue > 0 && value >= goal.targetValue && goal.status === "active"

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" aria-hidden />
            {t("portal.performance.goalProgress.title")}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {t("portal.performance.goalProgress.desc", { title: goal.title })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Before / After */}
          <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/40 p-3">
            <ProgressBar percent={beforePercent} label={t("portal.performance.goalProgress.before")} lang={lang} />
            <ProgressBar percent={afterPercent} label={t("portal.performance.goalProgress.after")} lang={lang} />
          </div>

          {/* Slider */}
          <div className="space-y-3">
            <Slider
              value={[Math.min(value, sliderMax)]}
              min={0}
              max={sliderMax}
              step={sliderMax > 100 ? Math.max(1, Math.round(sliderMax / 100)) : 1}
              onValueChange={(vals) => setValue(vals[0] ?? 0)}
              disabled={busy}
              aria-label={t("portal.performance.goalProgress.currentValue")}
            />
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label htmlFor="goal-current-value" className="text-xs font-medium text-muted-foreground">
                  {t("portal.performance.goalProgress.currentValue")} ({goal.unit})
                </label>
                <Input
                  id="goal-current-value"
                  className="h-10 mt-1 tabular-nums"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={String(value)}
                  disabled={busy}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    setValue(Number.isFinite(n) && n >= 0 ? n : 0)
                  }}
                />
              </div>
              <div className="pt-6 text-right text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {formatGoalValue(value, goal.unit, lang)}
                </span>{" "}
                / {formatGoalValue(goal.targetValue, goal.unit, lang)}
              </div>
            </div>
          </div>

          {willComplete && (
            <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success">
              {t("portal.performance.goalProgress.autoCompleteNote")}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)} disabled={busy}>
              {t("portal.common.cancel")}
            </Button>
            <Button type="button" className="h-10" disabled={busy} onClick={() => onSubmit(value)}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("portal.performance.goalProgress.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
