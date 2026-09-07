"use client"

// Payroll overview stat cards — gross / net / PF / generated employees for the
// selected period, with a skeleton fallback while the overview query loads.
import type { LucideIcon } from "lucide-react"
import { Banknote, PiggyBank, Users, Wallet } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { PayrollOverviewStats } from "./types"

/** Stat card with an optional helper note under the value. */
function NoteStatCard({
  title,
  value,
  note,
  icon: Icon,
  iconClassName,
}: {
  title: string
  value: string
  note?: string
  icon: LucideIcon
  iconClassName?: string
}) {
  return (
    <Card className="border-border/80 bg-card shadow-xs transition-shadow hover:shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {value}
          </p>
          {note && <p className="mt-1 text-[11px] text-muted-foreground/80">{note}</p>}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}

export function PayrollOverview({
  stats,
  isPending,
}: {
  stats: PayrollOverviewStats | undefined
  isPending: boolean
}) {
  const { lang, t } = useI18n()

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NoteStatCard title={t("portal.payroll.statGross")} value={formatBdt(stats.totalGross, lang)} icon={Banknote} />
      <NoteStatCard
        title={t("portal.payroll.statNet")}
        value={formatBdt(stats.totalNet, lang)}
        icon={Wallet}
        iconClassName="bg-success/10 text-success"
      />
      <NoteStatCard
        title={t("portal.payroll.statPf")}
        value={formatBdt(stats.totalPf, lang)}
        note={t("portal.payroll.statPfNote")}
        icon={PiggyBank}
        iconClassName="bg-primary/10 text-primary"
      />
      <NoteStatCard
        title={t("portal.payroll.statEmployees")}
        value={formatNumber(stats.generatedCount, lang)}
        note={t("portal.payroll.statEmployeesNote")}
        icon={Users}
        iconClassName="bg-warning/10 text-warning"
      />
    </div>
  )
}
