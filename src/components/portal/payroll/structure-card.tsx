"use client"

// Single salary structure card — name, default badge, usage count, edit/delete
// actions and the component breakdown list.
import { Pencil, Trash2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { componentValueLabel } from "./labels"
import type { SalaryStructureRow } from "./types"

export function StructureCard({
  structure,
  onEdit,
  onDelete,
}: {
  structure: SalaryStructureRow
  onEdit: (structure: SalaryStructureRow) => void
  onDelete: (structure: SalaryStructureRow) => void
}) {
  const { lang, t } = useI18n()
  const s = structure

  return (
    <Card className="border-border/80 shadow-xs">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">{s.name}</p>
              {s.isDefault && (
                <Badge className="border-primary/30 bg-primary/12 text-primary">
                  {t("portal.payroll.defaultBadge")}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("portal.payroll.usedBySlips", { n: formatNumber(s.payslipsCount, lang) })}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground hover:text-foreground"
              aria-label={t("portal.common.edit")}
              onClick={() => onEdit(s)}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground hover:text-destructive"
              aria-label={t("portal.common.delete")}
              onClick={() => onDelete(s)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="mt-3 border-t border-border/60 pt-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
            {t("portal.payroll.componentsLabel")} ({formatNumber(s.components.length, lang)})
          </p>
          <ul className="mt-1.5 max-h-48 space-y-0.5 overflow-y-auto pf-scrollbar">
            {s.components.map((c) => (
              <li key={c.id} className="flex items-center gap-2 py-1.5">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    c.type === "earning" ? "bg-primary" : "bg-destructive",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground sm:inline">
                  {c.abbr}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-mono text-xs font-semibold tabular-nums",
                    c.type === "earning" ? "text-primary" : "text-destructive",
                  )}
                >
                  {componentValueLabel(c, lang)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
