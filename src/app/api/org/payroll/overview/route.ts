// GET /api/org/payroll/overview?period=YYYY-MM — period stats + recent slips
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse } from "@/lib/api-utils"
import { currentPeriod, isPeriodKey } from "../_lib/payroll"

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const rawPeriod = searchParams.get("period")?.trim() ?? ""
  const period = rawPeriod && isPeriodKey(rawPeriod) ? rawPeriod : currentPeriod()

  try {
    const [periodRows, slips, eligible] = await Promise.all([
      db.payslip.findMany({
        where: { organizationId: guard.org.id },
        select: { period: true },
        distinct: ["period"],
      }),
      db.payslip.findMany({
        where: { organizationId: guard.org.id, period },
        select: {
          gross: true,
          netPay: true,
          totalEarnings: true,
          totalDeductions: true,
          pfEmployee: true,
          pfEmployer: true,
          status: true,
          employee: { select: { employeeCode: true, firstName: true, lastName: true } },
        },
      }),
      db.employee.count({
        where: {
          organizationId: guard.org.id,
          status: { in: ["active", "probation"] },
          monthlySalary: { gt: 0 },
        },
      }),
    ])

    const statusBreakdown = { draft: 0, confirmed: 0, paid: 0 }
    let totalGross = 0
    let totalNet = 0
    let totalPf = 0
    for (const s of slips) {
      totalGross += s.gross
      totalNet += s.netPay
      totalPf += s.pfEmployee + s.pfEmployer
      if (s.status === "draft") statusBreakdown.draft += 1
      else if (s.status === "confirmed") statusBreakdown.confirmed += 1
      else if (s.status === "paid") statusBreakdown.paid += 1
    }

    const recentSlips = [...slips]
      .sort((a, b) => b.netPay - a.netPay)
      .slice(0, 5)
      .map((s) => ({
        employeeCode: s.employee.employeeCode,
        employeeName: `${s.employee.firstName} ${s.employee.lastName}`.trim(),
        gross: s.gross,
        netPay: s.netPay,
        status: s.status,
      }))

    return ok({
      period,
      periods: periodRows.map((p) => p.period).sort((a, b) => b.localeCompare(a)),
      stats: {
        employees: eligible,
        totalGross,
        totalNet,
        totalPf,
        statusBreakdown,
        generatedCount: slips.length,
      },
      recentSlips,
    })
  } catch {
    return fail("overview_failed", 500)
  }
}
