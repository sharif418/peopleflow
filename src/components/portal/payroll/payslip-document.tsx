"use client"

// Official payslip document body — org header, employee block, earnings and
// deductions tables, totals and the provident-fund footer. Rendered inside the
// payslip detail dialog (and styled for print via pf-payslip-print).
import { PiggyBank } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt, formatDate, formatNumber, toBnDigits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { formatPeriod } from "./labels"
import type { PayslipDetailData } from "./types"

function DocRow({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2 last:border-b-0">
      <span className={cn("text-sm", strong ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("shrink-0 font-mono text-sm tabular-nums", strong && "font-semibold")}>
        ৳{formatNumber(amount, "en")}
      </span>
    </div>
  )
}

function Stamp({ status, label }: { status: string; label: string }) {
  const tone =
    status === "paid"
      ? "border-success/60 text-success"
      : status === "confirmed"
        ? "border-primary/60 text-primary"
        : "border-muted-foreground/50 text-muted-foreground"
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute right-5 top-5 hidden -rotate-6 select-none rounded-md border-2 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] opacity-80 sm:block",
        tone,
      )}
    >
      {label}
    </div>
  )
}

export function PayslipDocument({ data }: { data: PayslipDetailData }) {
  const { lang, t } = useI18n()

  const stampLabel =
    data.status === "paid"
      ? t("portal.payroll.stampPaid")
      : data.status === "confirmed"
        ? t("portal.payroll.stampConfirmed")
        : t("portal.payroll.stampDraft")

  const fields: { k: string; v: string }[] = [
    { k: t("portal.payroll.docEmpCode"), v: data.employee.code },
    { k: t("portal.payroll.docEmpName"), v: `${data.employee.firstName} ${data.employee.lastName}` },
    { k: t("portal.payroll.docEmpDesignation"), v: data.employee.designation ?? "—" },
    { k: t("portal.payroll.docEmpDepartment"), v: data.employee.department ?? "—" },
    {
      k: t("portal.payroll.docEmpJoining"),
      v: data.employee.dateOfJoining ? formatDate(data.employee.dateOfJoining, lang) : "—",
    },
    {
      k: t("portal.payroll.generateStructure"),
      v: data.structure ? data.structure.name : t("portal.payroll.generateStructureFallback"),
    },
  ]

  return (
    <div className="pf-payslip-print relative rounded-xl border bg-background p-4 shadow-xs sm:p-6">
      <Stamp status={data.status} label={stampLabel} />

      {/* Org header */}
      <div className="text-center">
        <p className="text-base font-bold tracking-tight sm:text-lg">{data.org.name}</p>
        {data.org.address && <p className="mt-0.5 text-xs text-muted-foreground">{data.org.address}</p>}
        <p className="mt-3 text-sm font-semibold text-primary">{t("portal.payroll.docPayslipTitle")}</p>
        <p className="text-xs text-muted-foreground">
          {t("portal.payroll.docPeriod")}:{" "}
          <span className="font-medium text-foreground">{formatPeriod(data.period, lang)}</span>
        </p>
      </div>

      <Separator className="my-4" />

      {/* Employee block */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        {fields.map((f) => (
          <div key={f.k} className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">{f.k}</p>
            <p className="truncate text-sm font-medium" title={f.v}>
              {f.v}
            </p>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      {/* Earnings */}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {t("portal.payroll.earningsTable")}
        </p>
        {data.items
          .filter((i) => i.type !== "deduction")
          .map((i) => (
            <DocRow key={i.id} label={i.label} amount={i.amount} />
          ))}
        <DocRow label={t("portal.payroll.totalEarnings")} amount={data.totalEarnings} strong />
      </div>

      {/* Deductions */}
      <div className="mt-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive">
          {t("portal.payroll.deductionsTable")}
        </p>
        {data.items.filter((i) => i.type === "deduction").length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t("portal.common.none")}</p>
        ) : (
          data.items
            .filter((i) => i.type === "deduction")
            .map((i) => <DocRow key={i.id} label={i.label} amount={i.amount} />)
        )}
        <DocRow label={t("portal.payroll.totalDeductions")} amount={data.totalDeductions} strong />
      </div>

      <Separator className="my-4" />

      {/* Totals */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("portal.payroll.grossLine")}</span>
          <span className="font-mono font-medium tabular-nums">{formatBdt(data.gross, lang)}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-success/10 px-4 py-3">
          <span className="text-sm font-bold text-success">{t("portal.payroll.netPay")}</span>
          <span className="font-mono text-xl font-bold tabular-nums text-success">
            {formatBdt(data.netPay, lang)}
          </span>
        </div>
      </div>

      {/* PF footer */}
      <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <PiggyBank className="size-3.5" aria-hidden />
          {t("portal.payroll.pfInfoTitle")}
        </p>
        {data.pfEmployee === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{t("portal.payroll.pfDisabledNote")}</p>
        ) : (
          <>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {t("portal.payroll.pfEmployeePart", { percent: toBnDigits(data.org.pfPercent) })}
                </p>
                <p className="font-mono text-sm font-semibold tabular-nums">
                  {formatBdt(data.pfEmployee, lang)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {t("portal.payroll.pfEmployerPart", { percent: toBnDigits(data.org.pfPercent) })}
                </p>
                <p className="font-mono text-sm font-semibold tabular-nums">
                  {formatBdt(data.pfEmployer, lang)}
                </p>
              </div>
              <div className="border-l border-primary/15">
                <p className="text-[11px] text-muted-foreground">{t("portal.payroll.pfTotalSaved")}</p>
                <p className="font-mono text-sm font-semibold tabular-nums text-primary">
                  {formatBdt(data.pfEmployee + data.pfEmployer, lang)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{t("portal.payroll.pfMatchNote")}</p>
          </>
        )}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground/70">
        {t("portal.payroll.generatedOn", { date: formatDate(data.createdAt, lang) })}
      </p>
    </div>
  )
}
