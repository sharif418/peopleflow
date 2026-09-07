"use client"

// Wizard step 3 — shift rows editor (name / start / end, add-remove rows).
import type { Dispatch, SetStateAction } from "react"
import { Plus, X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ShiftRow } from "../types"

export function ShiftsStep({
  shifts,
  setShifts,
}: {
  shifts: ShiftRow[]
  setShifts: Dispatch<SetStateAction<ShiftRow[]>>
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{t("portal.wizard.step4Title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("portal.wizard.step4Desc")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{t("portal.wizard.step4Hint")}</p>
      </div>
      <div className="space-y-3">
        {shifts.map((sh, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-[1fr_120px_120px_auto]"
          >
            <div className="space-y-1.5">
              <Label htmlFor={`shift-name-${idx}`} className="text-xs text-muted-foreground">
                {t("portal.shifts.formName")}
              </Label>
              <Input
                id={`shift-name-${idx}`}
                className="h-10"
                placeholder={t("portal.shifts.namePh")}
                value={sh.name}
                onChange={(e) =>
                  setShifts((rows) => rows.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`shift-start-${idx}`} className="text-xs text-muted-foreground">
                {t("portal.common.startTime")}
              </Label>
              <Input
                id={`shift-start-${idx}`}
                className="h-10 tabular-nums"
                type="time"
                value={sh.startTime}
                onChange={(e) =>
                  setShifts((rows) => rows.map((r, i) => (i === idx ? { ...r, startTime: e.target.value } : r)))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`shift-end-${idx}`} className="text-xs text-muted-foreground">
                {t("portal.common.endTime")}
              </Label>
              <Input
                id={`shift-end-${idx}`}
                className="h-10 tabular-nums"
                type="time"
                value={sh.endTime}
                onChange={(e) =>
                  setShifts((rows) => rows.map((r, i) => (i === idx ? { ...r, endTime: e.target.value } : r)))
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-destructive hover:bg-destructive/10"
              disabled={shifts.length <= 1}
              onClick={() => setShifts((rows) => rows.filter((_, i) => i !== idx))}
              aria-label={t("portal.wizard.remove")}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full border-dashed"
          onClick={() => setShifts((rows) => [...rows, { name: "", startTime: "09:00", endTime: "18:00" }])}
        >
          <Plus className="size-4" aria-hidden />
          {t("portal.wizard.addRow")}
        </Button>
      </div>
    </div>
  )
}
