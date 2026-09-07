"use client"

// Single payslip summary card — employee identity, gross → net figures and a
// PF chip. Whole card is a button that opens the payslip document dialog.
import { motion } from "framer-motion"
import { ArrowRight, PiggyBank } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { payslipStatusBadgeClass, payslipStatusLabel } from "./labels"
import type { PayslipListRow } from "./types"

export function PayslipCard({
  slip,
  index,
  onOpen,
}: {
  slip: PayslipListRow
  index: number
  onOpen: (id: string) => void
}) {
  const { lang, t } = useI18n()
  const name = `${slip.employee.firstName} ${slip.employee.lastName}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.03 }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${t("portal.payroll.viewSlip")} — ${name}`}
        onClick={() => onOpen(slip.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onOpen(slip.id)
          }
        }}
        className="group h-full cursor-pointer rounded-xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-primary/12 text-xs font-semibold text-primary">
                {initialsOf(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate font-mono text-[11px] font-semibold tracking-wide text-primary">
                {slip.employee.code}
              </p>
            </div>
          </div>
          <Badge className={cn("shrink-0", payslipStatusBadgeClass(slip.status))}>
            {payslipStatusLabel(slip.status, t)}
          </Badge>
        </div>

        <p className="mt-1.5 truncate text-xs text-muted-foreground">
          {slip.employee.designation ?? t("portal.common.notSet")}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate tabular-nums">{formatBdt(slip.gross, lang)}</span>
            <ArrowRight
              className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
            <span className="truncate font-semibold tabular-nums text-foreground">
              {formatBdt(slip.netPay, lang)}
            </span>
          </div>
          {slip.pfEmployee > 0 && (
            <Badge variant="outline" className="shrink-0 gap-1 border-primary/25 bg-primary/8 px-1.5 text-[10px] font-medium text-primary">
              <PiggyBank className="size-3" aria-hidden />
              {t("portal.payroll.cardPf")} {formatBdt(slip.pfEmployee, lang)}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  )
}
