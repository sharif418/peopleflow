"use client"

// Salary structure component rows editor — dynamic earning/deduction rows with
// name / abbr / type / calc-type / value inputs, live percent-sum badge and
// add / remove controls. Row state lives in the parent structure form dialog.
import { useMemo } from "react"
import { Plus, Trash2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EARNING_BADGE, DEDUCTION_BADGE } from "./labels"
import type { ComponentFormRow } from "./types"

export function StructureRowsEditor({
  rows,
  updateRow,
  removeRow,
  addRow,
}: {
  rows: ComponentFormRow[]
  updateRow: (i: number, patch: Partial<ComponentFormRow>) => void
  removeRow: (i: number) => void
  addRow: () => void
}) {
  const { t } = useI18n()

  const percentSum = useMemo(
    () =>
      rows
        .filter((r) => r.type === "earning" && r.calcType === "percent")
        .reduce((acc, r) => acc + (Number(r.value) || 0), 0),
    [rows],
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t("portal.payroll.formComponentsTitle")}</p>
        <Badge variant="outline" className={percentSum > 100 ? DEDUCTION_BADGE : EARNING_BADGE}>
          {percentSum > 100 ? "> 100%" : `${percentSum}%`}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{t("portal.payroll.formComponentsDesc")}</p>

      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-2 items-end gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-[1fr_90px_1fr_1fr_88px_36px]"
          >
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("portal.common.name")}</Label>
              <Input
                value={row.name}
                maxLength={60}
                placeholder={t("portal.payroll.compNamePlaceholder")}
                onChange={(e) => updateRow(i, { name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("portal.payroll.abbrLabel")}</Label>
              <Input
                value={row.abbr}
                maxLength={8}
                placeholder={t("portal.payroll.abbrPlaceholder")}
                className="font-mono uppercase"
                onChange={(e) => updateRow(i, { abbr: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("portal.payroll.typeLabel")}</Label>
              <Select value={row.type} onValueChange={(v) => updateRow(i, { type: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="earning">{t("portal.payroll.compEarning")}</SelectItem>
                  <SelectItem value="deduction">{t("portal.payroll.compDeduction")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("portal.payroll.calcLabel")}</Label>
              <Select value={row.calcType} onValueChange={(v) => updateRow(i, { calcType: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">{t("portal.payroll.calcPercent")}</SelectItem>
                  <SelectItem value="fixed">{t("portal.payroll.calcFixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                {t("portal.payroll.valueLabel")}
                {row.calcType === "percent" ? " (%)" : " (৳)"}
              </Label>
              <Input
                type="number"
                min={0}
                max={row.calcType === "percent" ? 100 : undefined}
                value={row.value}
                inputMode="decimal"
                onChange={(e) => updateRow(i, { value: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground hover:text-destructive"
              aria-label={t("portal.payroll.removeComponent")}
              disabled={rows.length <= 1}
              onClick={() => removeRow(i)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addRow}>
        <Plus className="size-4" aria-hidden />
        {t("portal.payroll.addComponent")}
      </Button>
    </div>
  )
}
