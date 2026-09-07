"use client"

// Wizard step 5 — review summary with counts and dept/designation badges.
import { Briefcase, Clock, Network, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Badge } from "@/components/ui/badge"
import type { ShiftRow } from "../types"

export function ReviewStep({
  depts,
  desigs,
  shifts,
  employeeCount,
}: {
  depts: string[]
  desigs: string[]
  shifts: ShiftRow[]
  employeeCount: number
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{t("portal.wizard.step6Title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("portal.wizard.step6Desc")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("portal.wizard.step6Depts"), value: depts.length, icon: Network },
          { label: t("portal.wizard.step6Desigs"), value: desigs.length, icon: Briefcase },
          { label: t("portal.wizard.step6Shifts"), value: shifts.filter((s) => s.name.trim()).length, icon: Clock },
          { label: t("portal.wizard.step6Emps"), value: employeeCount, icon: Users },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="rounded-xl border border-border/70 bg-muted/30 p-3 text-center">
              <Icon className="mx-auto size-5 text-primary" aria-hidden />
              <p className="mt-1.5 text-2xl font-bold tabular-nums">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          )
        })}
      </div>
      {(depts.length > 0 || desigs.length > 0) && (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-1.5">
            {depts.map((d) => (
              <Badge key={d} variant="secondary" className="bg-primary/10 font-normal text-primary">
                {d}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {desigs.map((d) => (
              <Badge key={d} variant="outline" className="font-normal">
                {d}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
