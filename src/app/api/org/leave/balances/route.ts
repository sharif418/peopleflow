// GET /api/org/leave/balances?year=YYYY — per active employee leave balances
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse } from "@/lib/api-utils"

const YEAR_RE = /^\d{4}$/

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const yearParam = (searchParams.get("year") ?? "").trim()
  const year = yearParam === "" ? String(new Date().getFullYear()) : yearParam
  if (!YEAR_RE.test(year)) return fail("invalid_year", 400)

  try {
    const [types, employees, requests] = await Promise.all([
      db.leaveType.findMany({
        where: { organizationId: guard.org.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, daysPerYear: true },
      }),
      db.employee.findMany({
        where: { organizationId: guard.org.id, status: "active" },
        orderBy: { employeeCode: "asc" },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
        },
      }),
      db.leaveRequest.findMany({
        where: {
          organizationId: guard.org.id,
          status: { in: ["approved", "pending"] },
          fromDate: { startsWith: year },
        },
        select: { employeeId: true, leaveTypeId: true, status: true, days: true },
      }),
    ])

    // usage[employeeId][leaveTypeId] = { approved, pending }
    const usage = new Map<string, Map<string, { approved: number; pending: number }>>()
    for (const r of requests) {
      const perEmp = usage.get(r.employeeId) ?? new Map()
      const entry = perEmp.get(r.leaveTypeId) ?? { approved: 0, pending: 0 }
      if (r.status === "approved") entry.approved += r.days
      else entry.pending += r.days
      perEmp.set(r.leaveTypeId, entry)
      usage.set(r.employeeId, perEmp)
    }

    const items = employees.map((e) => {
      const perEmp = usage.get(e.id)
      const rows = types.map((t) => {
        const entry = perEmp?.get(t.id) ?? { approved: 0, pending: 0 }
        const used = entry.approved
        return {
          leaveTypeId: t.id,
          name: t.name,
          allocated: t.daysPerYear,
          used,
          pending: entry.pending,
          remaining: t.daysPerYear - used - entry.pending,
        }
      })
      const totalUsed = rows.reduce((sum, r) => sum + r.used, 0)
      return {
        employeeId: e.id,
        code: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
        department: e.department?.name ?? null,
        rows,
        totalUsed,
      }
    })

    return ok({ year, types: types.map((t) => ({ id: t.id, name: t.name })), items })
  } catch {
    return fail("list_failed", 500)
  }
}
