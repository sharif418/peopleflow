// GET /api/org/attendance?date=YYYY-MM-DD — one row per active employee + their log
// POST /api/org/attendance — manual punch upsert (source "manual")
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../_lib/helpers"
import {
  ACTIVE_STATUSES,
  DEFAULT_SHIFT_START,
  DEFAULT_SHIFT_END,
  computePunch,
  isWeekendDate,
  loadEmployeesWithLogs,
  localIsoDate,
  parseWeekendConfig,
  recomputeAttendanceDay,
  timeToMinutes,
  toDayItem,
  type DayItem,
  type LogStatus,
} from "./_lib/attendance"
import { punchSchema, zodError } from "./_lib/schemas"

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")?.trim() ?? localIsoDate()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    return fail("invalid_date", 400)
  }

  try {
    const weekend = parseWeekendConfig(guard.org.weekendConfig)
    const employees = await loadEmployeesWithLogs(guard.org.id, date, date)
    const items = employees.map((e) => toDayItem(e, date))

    const stats = { present: 0, late: 0, absent: 0, onLeave: 0, halfDay: 0, noRecord: 0 }
    for (const item of items) {
      switch (item.status) {
        case "present":
          stats.present++
          break
        case "late":
          stats.late++
          break
        case "absent":
          stats.absent++
          break
        case "on_leave":
          stats.onLeave++
          break
        case "half_day":
          stats.halfDay++
          break
        default:
          stats.noRecord++
      }
    }

    return ok({ date, isWeekend: isWeekendDate(date, weekend), stats, items })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = punchSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const data = parsed.data

  if (data.checkIn && data.checkOut && timeToMinutes(data.checkOut) <= timeToMinutes(data.checkIn)) {
    return fail("invalid_time_range", 400)
  }

  const employee = await db.employee.findFirst({
    where: { id: data.employeeId, organizationId: guard.org.id, status: { in: ACTIVE_STATUSES } },
    include: {
      department: { select: { name: true } },
      shift: { select: { startTime: true, endTime: true } },
    },
  })
  if (!employee) return fail("invalid_employee", 404)

  const shiftStart = employee.shift?.startTime ?? DEFAULT_SHIFT_START
  const shiftEnd = employee.shift?.endTime ?? DEFAULT_SHIFT_END
  const { status, workedMinutes } = computePunch({
    checkIn: data.checkIn ?? null,
    checkOut: data.checkOut ?? null,
    shiftStart,
    shiftEnd,
    explicitStatus: (data.status ?? null) as LogStatus | null,
  })

  try {
    const log = await db.attendanceLog.upsert({
      where: { employeeId_date: { employeeId: employee.id, date: data.date } },
      create: {
        organizationId: guard.org.id,
        employeeId: employee.id,
        date: data.date,
        checkIn: data.checkIn ?? null,
        checkOut: data.checkOut ?? null,
        status,
        workedMinutes,
        source: "manual",
        deviceId: null, // manual entry never claims a device
        note: data.note ?? null,
      },
      update: {
        checkIn: data.checkIn ?? null,
        checkOut: data.checkOut ?? null,
        status,
        workedMinutes,
        source: "manual",
        deviceId: null,
        note: data.note ?? null,
      },
    })

    await recomputeAttendanceDay(guard.org.id, data.date)
    await audit(
      guard,
      "attendance.manual_punch",
      "attendance_log",
      log.id,
      `${employee.employeeCode} ${employee.firstName} ${employee.lastName} · ${data.date} · ${status}`,
    )

    const item: DayItem = {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      department: employee.department?.name ?? null,
      shiftStart: employee.shift?.startTime ?? null,
      shiftEnd: employee.shift?.endTime ?? null,
      checkIn: log.checkIn,
      checkOut: log.checkOut,
      status: log.status,
      workedMinutes: log.workedMinutes,
      source: log.source,
      note: log.note,
    }
    return ok(item, 201)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("conflict", 409)
    return fail("save_failed", 500)
  }
}
