// GET /api/org/overview — portal dashboard data (org-scoped)
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse } from "@/lib/api-utils"

interface Grouped {
  key: string | null
  count: number
}

function groupedToHeadcount(
  rows: Grouped[],
  nameMap: Map<string, string>,
): { name: string | null; count: number }[] {
  const out: { name: string | null; count: number }[] = []
  for (const r of rows) {
    out.push({ name: r.key ? (nameMap.get(r.key) ?? null) : null, count: r.count })
  }
  out.sort((a, b) => b.count - a.count)
  return out
}

export async function GET() {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const orgId = guard.org.id

  try {
    const [statusGroups, latestAttendance, payrollAgg, attendance14, deptGroups, recentHires] =
      await Promise.all([
        db.employee.groupBy({ by: ["status"], _count: { _all: true }, where: { organizationId: orgId } }),
        db.attendanceDay.findFirst({ where: { organizationId: orgId }, orderBy: { date: "desc" } }),
        db.employee.aggregate({
          _sum: { monthlySalary: true },
          where: { organizationId: orgId, status: "active" },
        }),
        db.attendanceDay.findMany({
          where: { organizationId: orgId },
          orderBy: { date: "desc" },
          take: 14,
          select: { date: true, present: true, absent: true, late: true, onLeave: true },
        }),
        db.employee.groupBy({
          by: ["departmentId"],
          _count: { _all: true },
          where: { organizationId: orgId },
        }),
        db.employee.findMany({
          where: { organizationId: orgId },
          orderBy: { dateOfJoining: "desc" },
          take: 5,
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            designation: { select: { name: true } },
            department: { select: { name: true } },
            dateOfJoining: true,
          },
        }),
      ])

    const statusMap: Record<string, number> = {}
    let total = 0
    for (const g of statusGroups) {
      statusMap[g.status] = g._count._all
      total += g._count._all
    }

    const depts = await db.department.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    })
    const deptNameMap = new Map(depts.map((d) => [d.id, d.name]))
    const headcountByDept = groupedToHeadcount(
      deptGroups.map((d) => ({ key: d.departmentId, count: d._count._all })),
      deptNameMap,
    )

    return ok({
      employees: {
        total,
        active: statusMap["active"] ?? 0,
        probation: statusMap["probation"] ?? 0,
        inactive: (statusMap["inactive"] ?? 0) + (statusMap["suspended"] ?? 0),
      },
      attendanceToday: latestAttendance
        ? {
            present: latestAttendance.present,
            absent: latestAttendance.absent,
            late: latestAttendance.late,
            onLeave: latestAttendance.onLeave,
          }
        : { present: 0, absent: 0, late: 0, onLeave: 0 },
      payrollMonthly: payrollAgg._sum.monthlySalary ?? 0,
      attendance: [...attendance14].reverse(),
      headcountByDept,
      recentHires: recentHires.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
        designation: e.designation?.name ?? null,
        department: e.department?.name ?? null,
        dateOfJoining: e.dateOfJoining,
      })),
    })
  } catch {
    return fail("overview_failed", 500)
  }
}
