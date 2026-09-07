// POST /api/org/attendance/sync — ZKTeco-style simulated device pull
// body: { deviceId?, date? (default today), mode?: "full" | "missing" (default missing) }
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit } from "../../_lib/helpers"
import {
  DEFAULT_SHIFT_END,
  DEFAULT_SHIFT_START,
  computePunch,
  localIsoDate,
  loadEmployeesWithLogs,
  minutesToTime,
  prand,
  recomputeAttendanceDay,
  timeToMinutes,
  toDayItem,
} from "../_lib/attendance"
import { syncSchema, zodError } from "../_lib/schemas"

// Simulated ZKTeco pull latency — makes the sync feel like a real device round-trip
const SYNC_DELAY_MS = 1200

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = syncSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const data = parsed.data

  const date = data.date ?? localIsoDate()
  const today = localIsoDate()

  // Resolve the device (explicit id, or the org's first registered terminal)
  const device = data.deviceId
    ? await db.device.findFirst({ where: { id: data.deviceId, organizationId: guard.org.id } })
    : await db.device.findFirst({ where: { organizationId: guard.org.id }, orderBy: { createdAt: "asc" } })
  if (!device) return fail("no_device", 404)

  await new Promise((r) => setTimeout(r, SYNC_DELAY_MS))

  try {
    const employees = await loadEmployeesWithLogs(guard.org.id, date, date)
    const targets =
      data.mode === "full"
        ? employees
        : employees.filter((e) => !e.attendanceLogs.some((l) => l.date === date))

    const dayOfMonth = Number(date.slice(8, 10))
    for (const employee of targets) {
      const shiftStart = employee.shift?.startTime ?? DEFAULT_SHIFT_START
      const shiftEnd = employee.shift?.endTime ?? DEFAULT_SHIFT_END

      // deterministic-ish seed from employee code + date
      let seedBase = 0
      for (const ch of employee.employeeCode) seedBase += ch.charCodeAt(0)
      const seed = seedBase + dayOfMonth * 31

      // punch in: shiftStart-15 … shiftStart+35
      const inOffset = Math.floor(prand(seed) * 50) - 15
      const checkIn = minutesToTime(timeToMinutes(shiftStart) + inOffset)

      // punch out: past dates always have one (shiftEnd ± 40); today 60% are
      // still working (no out punch); future dates get none
      let checkOut: string | null = null
      if (date < today) {
        const outOffset = Math.floor(prand(seed + 7) * 80) - 40
        checkOut = minutesToTime(timeToMinutes(shiftEnd) + outOffset)
      } else if (date === today && prand(seed + 13) > 0.6) {
        const outOffset = Math.floor(prand(seed + 29) * 40)
        checkOut = minutesToTime(timeToMinutes(shiftEnd) + outOffset)
      }

      const { status, workedMinutes } = computePunch({ checkIn, checkOut, shiftStart, shiftEnd })

      await db.attendanceLog.upsert({
        where: { employeeId_date: { employeeId: employee.id, date } },
        create: {
          organizationId: guard.org.id,
          employeeId: employee.id,
          date,
          checkIn,
          checkOut,
          status,
          workedMinutes,
          source: "device",
          deviceId: device.id,
          note: null,
        },
        update: {
          checkIn,
          checkOut,
          status,
          workedMinutes,
          source: "device",
          deviceId: device.id,
          note: null,
        },
      })
    }

    const syncedCount = targets.length
    const now = new Date()
    const updatedDevice = await db.device.update({
      where: { id: device.id },
      data: { status: "online", lastSyncAt: now },
      select: {
        id: true,
        name: true,
        serialNo: true,
        model: true,
        status: true,
        lastSyncAt: true,
      },
    })

    await recomputeAttendanceDay(guard.org.id, date)
    await audit(
      guard,
      "attendance.device_sync",
      "device",
      device.id,
      `${device.name} · ${date} · ${syncedCount} রেকর্ড · mode=${data.mode}`,
    )

    // Latest rows as rich day-items (fresh read after the upserts)
    const fresh = await loadEmployeesWithLogs(guard.org.id, date, date)
    const log = fresh.map((e) => toDayItem(e, date))

    return ok({ syncedCount, date, mode: data.mode, device: updatedDevice, log })
  } catch {
    return fail("sync_failed", 500)
  }
}
