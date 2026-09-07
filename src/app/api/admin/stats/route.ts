// GET /api/admin/stats — platform overview metrics for the super admin dashboard
import { db } from "@/lib/db"
import { ok, fail, requireSuperAdmin, isResponse } from "@/lib/api-utils"
import { toOrgSummary } from "../_lib/helpers"
import { PLAN_MAP } from "@/lib/features"

export async function GET() {
  const guard = await requireSuperAdmin()
  if (isResponse(guard)) return guard

  try {
    const [orgs, employeesTotal, invoices, recentLogs] = await Promise.all([
      db.organization.findMany({
        include: { _count: { select: { employees: true, users: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.employee.count(),
      db.invoice.findMany({ where: { status: { in: ["paid", "pending"] } } }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { organization: { select: { name: true } } },
      }),
    ])

    // Last 6 months (incl. current) as YYYY-MM periods
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    }

    const revenueByMonth = months.map((period) => ({
      period,
      amount: invoices
        .filter((inv) => inv.period === period)
        .reduce((sum, inv) => sum + inv.amount, 0),
    }))

    const monthOf = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    const orgsCreatedTrend = months.map((period) => ({
      period,
      count: orgs.filter((o) => monthOf(o.createdAt) === period).length,
    }))

    const orgsByPlan = Object.keys(PLAN_MAP).map((planKey) => ({
      planKey,
      count: orgs.filter((o) => o.planKey === planKey).length,
    }))

    const mrr = orgs
      .filter((o) => o.status === "active")
      .reduce((sum, o) => sum + (PLAN_MAP[o.planKey]?.priceBdt ?? 0), 0)

    const data = {
      orgsTotal: orgs.length,
      orgsActive: orgs.filter((o) => o.status === "active").length,
      orgsSuspended: orgs.filter((o) => o.status === "suspended").length,
      orgsProvisioning: orgs.filter((o) => o.status === "provisioning").length,
      employeesTotal,
      mrr,
      arr: mrr * 12,
      revenueByMonth,
      orgsByPlan,
      orgsCreatedTrend,
      recentOrgs: orgs.slice(0, 5).map(toOrgSummary),
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        actor: log.actor,
        action: log.action,
        details: log.details,
        createdAt: log.createdAt.toISOString(),
      })),
    }
    return ok(data)
  } catch {
    return fail("failed to compute stats", 500)
  }
}
