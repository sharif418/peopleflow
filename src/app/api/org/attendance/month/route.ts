// GET /api/org/attendance/month?month=YYYY-MM — monthly register matrix
import { ok, fail, requireOrg, isResponse } from "@/lib/api-utils"
import {
  type MonthDayInfo,
  type MonthRow,
  dayOfWeek,
  daysInMonth,
  isWeekendDate,
  loadEmployeesWithLogs,
  localIsoDate,
  localIsoMonth,
  parseWeekendConfig,
} from "../_lib/attendance"

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month")?.trim() ?? localIsoMonth()
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number.isNaN(new Date(`${month}-01T00:00:00`).getTime())) {
    return fail("invalid_month", 400)
  }

  try {
    const weekend = parseWeekendConfig(guard.org.weekendConfig)
    const total = daysInMonth(month)
    const days: MonthDayInfo[] = []
    for (let d = 1; d <= total; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`
      days.push({ date, dayOfWeek: dayOfWeek(date), isWeekend: isWeekendDate(date, weekend) })
    }

    // Days that should have logs: non-weekend days, capped to today for the
    // current month (future days don't count as "no record" yet).
    const today = localIsoDate()
    const relevantDays = days.filter(
      (d) => !d.isWeekend && (month < today.slice(0, 7) || d.date <= today),
    ).length

    const employees = await loadEmployeesWithLogs(guard.org.id, `${month}-01`, `${month}-${String(total).padStart(2, "0")}`)

    const totals = { present: 0, late: 0, absent: 0, onLeave: 0 }
    const rows: MonthRow[] = employees.map((e) => {
      const summary = {
        present: 0,
        late: 0,
        absent: 0,
        onLeave: 0,
        halfDays: 0,
        noRecord: 0,
        workedHours: 0,
      }
      const byDate: MonthRow["byDate"] = {}
      let workedMinutes = 0
      for (const log of e.attendanceLogs) {
        byDate[log.date] = { status: log.status, checkIn: log.checkIn, checkOut: log.checkOut }
        workedMinutes += log.workedMinutes
        switch (log.status) {
          case "late":
            summary.late++
            break
          case "absent":
            summary.absent++
            break
          case "on_leave":
            summary.onLeave++
            break
          case "half_day":
            summary.halfDays++
            break
          default:
            summary.present++
        }
      }
      summary.noRecord = Math.max(0, relevantDays - e.attendanceLogs.length)
      summary.workedHours = Math.round((workedMinutes / 60) * 10) / 10

      totals.present += summary.present
      totals.late += summary.late
      totals.absent += summary.absent
      totals.onLeave += summary.onLeave

      return {
        employeeId: e.id,
        code: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
        summary,
        byDate,
      }
    })

    return ok({ month, days, rows, totals })
  } catch {
    return fail("list_failed", 500)
  }
}
