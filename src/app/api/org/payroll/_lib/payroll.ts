// BD payroll computation engine — pure functions, shared by /api/org/payroll routes.
// Rules: gross = employee.monthlySalary; percent components = round(gross × value/100);
// fixed components = value BDT; earnings are adjusted to sum EXACTLY gross via the
// last percent component; PF (if enabled) = org.pfPercent% of BASIC, employee share
// matched by employer share; netPay = totalEarnings − totalDeductions.
import { toBnDigits } from "@/lib/format"

export interface ComponentInput {
  name: string
  abbr: string
  type: string // "earning" | "deduction"
  calcType: string // "percent" | "fixed"
  value: number
}

export interface ComputedItem {
  label: string
  type: "earning" | "deduction"
  amount: number
  abbr: string
}

export interface ComputedTotals {
  gross: number
  totalEarnings: number
  totalDeductions: number
  netPay: number
  pfEmployee: number
  pfEmployer: number
}

export interface ComputedPayslip {
  items: ComputedItem[]
  totals: ComputedTotals
}

/** BD default structure used when an org has no salary structures at all. */
export const BD_DEFAULTS: ComponentInput[] = [
  { name: "মূল বেতন", abbr: "BASIC", type: "earning", calcType: "percent", value: 50 },
  { name: "বাড়ি ভাড়া ভাতা", abbr: "HRA", type: "earning", calcType: "percent", value: 30 },
  { name: "চিকিৎসা ভাতা", abbr: "MED", type: "earning", calcType: "percent", value: 10 },
  { name: "যাতায়াত ভাতা", abbr: "CONV", type: "earning", calcType: "percent", value: 10 },
]

/**
 * Compute a full payslip from gross salary, structure components and PF config.
 * Pure — no DB, no clock. The main agent may reuse this directly.
 */
export function computePayslip(
  gross: number,
  components: ComponentInput[],
  pf: { enabled: boolean; percent: number },
): ComputedPayslip {
  const safeGross = Math.max(0, Math.round(gross))
  const earnings: ComputedItem[] = []
  const deductions: ComputedItem[] = []

  // 1) Compute every component's amount.
  const computed = components.map((c) => {
    const amount =
      c.calcType === "percent" ? Math.round((safeGross * c.value) / 100) : Math.round(c.value)
    return { c, amount }
  })

  // 2) Make earnings sum EXACTLY gross by adjusting the last percent-earning
  //    by whatever the other components left over (to-the-taka precision).
  const earningsComputed = computed.filter((x) => x.c.type !== "deduction")
  const lastPercentIdx = [...earningsComputed].reverse().findIndex((x) => x.c.calcType === "percent")
  if (lastPercentIdx !== -1) {
    const target = earningsComputed.length - 1 - lastPercentIdx
    const sumOthers = earningsComputed.reduce((acc, x, i) => (i === target ? acc : acc + x.amount), 0)
    earningsComputed[target].amount = safeGross - sumOthers
  }

  for (const { c, amount } of computed) {
    const item: ComputedItem = {
      label: c.name,
      type: c.type === "deduction" ? "deduction" : "earning",
      amount,
      abbr: c.abbr,
    }
    if (item.type === "deduction") deductions.push(item)
    else earnings.push(item)
  }

  // 3) Provident fund — employee share = pfPercent% of BASIC, employer matches it.
  let pfEmployee = 0
  let pfEmployer = 0
  if (pf.enabled && pf.percent > 0) {
    const basicItem = earningsComputed.find((x) => x.c.abbr.toUpperCase() === "BASIC")
    const basic = basicItem ? basicItem.amount : Math.round(safeGross * 0.5)
    pfEmployee = Math.round((basic * pf.percent) / 100)
    pfEmployer = pfEmployee
    deductions.push({
      label: `প্রভিডেন্ট ফান্ড (${toBnDigits(pf.percent)}%)`,
      type: "deduction",
      amount: pfEmployee,
      abbr: "PF",
    })
  }

  const totalEarnings = earnings.reduce((acc, x) => acc + x.amount, 0)
  const totalDeductions = deductions.reduce((acc, x) => acc + x.amount, 0)

  return {
    items: [...earnings, ...deductions],
    totals: {
      gross: safeGross,
      totalEarnings,
      totalDeductions,
      netPay: totalEarnings - totalDeductions,
      pfEmployee,
      pfEmployer,
    },
  }
}

/** Current period "YYYY-MM" for a date (server local time). */
export function currentPeriod(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** Validate "YYYY-MM" shape. */
export function isPeriodKey(value: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false
  const [y, m] = value.split("-").map(Number)
  return y >= 2000 && y <= 2100 && m >= 1 && m <= 12
}
