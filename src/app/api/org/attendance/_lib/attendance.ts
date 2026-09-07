// Attendance module server helpers — time math, status computation, aggregates
// (Task 4-a owned; mirrors the punch rules used by prisma/seed.ts)
import { db } from "@/lib/db"

export const GRACE_MINUTES = 10 // late threshold after shift start
export const LUNCH_MINUTES = 60 // unpaid lunch deducted from worked time
export const DEFAULT_SHIFT_START = "09:00"
export const DEFAULT_SHIFT_END = "18:00"
export const ACTIVE_STATUSES = ["active", "probation"]
export const LOG_STATUSES = ["present", "late", "half_day", "absent", "on_leave"] as const
export type LogStatus = (typeof LOG_STATUSES)[number]

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const

/** Local (server timezone) YYYY-MM-DD — same convention as the seed. */
export function localIsoDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Local YYYY-MM for the current month. */
export function localIsoMonth(d = new Date()): string {
  return localIsoDate(d).slice(0, 7)
}

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return !Number.isNaN(new Date(`${s}T00:00:00`).getTime())
}

export function isValidMonthStr(s: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return false
  return isValidDateStr(`${s}-01`)
}

export function timeToMinutes(t: string): number {
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
}

export function minutesToTime(m: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(m)))
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`
}

/** Parse org.weekendConfig ("friday,saturday") into a set of JS day indices (0=Sun). */
export function parseWeekendConfig(config: string | null | undefined): Set<number> {
  if (!config) return new Set()
  const out = new Set<number>()
  for (const part of config.split(",")) {
    const idx = DAY_NAMES.indexOf(part.trim().toLowerCase() as (typeof DAY_NAMES)[number])
    if (idx >= 0) out.add(idx)
  }
  return out
}

/** JS day-of-week index (0=Sunday) for a YYYY-MM-DD string. */
export function dayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getDay()
}

export function isWeekendDate(dateStr: string, weekend: Set<number>): boolean {
  return weekend.has(dayOfWeek(dateStr))
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m, 0).getDate()
}

export interface PunchInput {
  checkIn: string | null
  checkOut: string | null
  shiftStart: string
  shiftEnd: string
  explicitStatus?: LogStatus | null
}

export interface PunchResult {
  status: LogStatus
  workedMinutes: number
}

/**
 * Compute status + worked minutes from a punch pair:
 * - present if checkIn ≤ shiftStart + grace, else late (unless explicit status wins)
 * - absent/on_leave when there is no check-in (or explicit)
 * - workedMinutes = checkOut - checkIn - 60min lunch (min 0); 0 when still working
 */
export function computePunch(input: PunchInput): PunchResult {
  const { checkIn, checkOut, explicitStatus } = input
  let status: LogStatus
  if (explicitStatus) {
    status = explicitStatus
  } else if (!checkIn) {
    status = "absent"
  } else {
    status = timeToMinutes(checkIn) <= timeToMinutes(input.shiftStart) + GRACE_MINUTES ? "present" : "late"
  }

  let workedMinutes = 0
  if (checkIn && checkOut) {
    workedMinutes = Math.max(0, timeToMinutes(checkOut) - timeToMinutes(checkIn) - LUNCH_MINUTES)
  }
  return { status, workedMinutes }
}

/**
 * Recompute the daily AttendanceDay aggregate for one org+date from raw logs.
 * (half_day counts as present — schema has no separate column, matches seed rules.)
 */
export async function recomputeAttendanceDay(organizationId: string, date: string): Promise<void> {
  const logs = await db.attendanceLog.findMany({
    where: { organizationId, date },
    select: { status: true },
  })
  let present = 0
  let absent = 0
  let late = 0
  let onLeave = 0
  for (const l of logs) {
    if (l.status === "on_leave") onLeave++
    else if (l.status === "absent") absent++
    else if (l.status === "late") late++
    else present++ // present | half_day
  }
  await db.attendanceDay.upsert({
    where: { organizationId_date: { organizationId, date } },
    create: { organizationId, date, present, absent, late, onLeave },
    update: { present, absent, late, onLeave },
  })
}

/** Active employees with department, shift and the log rows for a date range. */
export async function loadEmployeesWithLogs(organizationId: string, dateFrom: string, dateTo: string) {
  return db.employee.findMany({
    where: { organizationId, status: { in: ACTIVE_STATUSES } },
    include: {
      department: { select: { name: true } },
      shift: { select: { name: true, startTime: true, endTime: true } },
      attendanceLogs: { where: { date: { gte: dateFrom, lte: dateTo } } },
    },
    orderBy: { employeeCode: "asc" },
  })
}

type EmployeeWithLogs = Awaited<ReturnType<typeof loadEmployeesWithLogs>>[number]

export interface DayItem {
  employeeId: string
  employeeCode: string
  firstName: string
  lastName: string
  department: string | null
  shiftStart: string | null
  shiftEnd: string | null
  checkIn: string | null
  checkOut: string | null
  status: string | null
  workedMinutes: number | null
  source: string | null
  note: string | null
}

/** Map one employee + their log for the target date to the day-item response shape. */
export function toDayItem(employee: EmployeeWithLogs, date: string): DayItem {
  const log = employee.attendanceLogs.find((l) => l.date === date) ?? null
  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    department: employee.department?.name ?? null,
    shiftStart: employee.shift?.startTime ?? null,
    shiftEnd: employee.shift?.endTime ?? null,
    checkIn: log?.checkIn ?? null,
    checkOut: log?.checkOut ?? null,
    status: log?.status ?? null,
    workedMinutes: log?.workedMinutes ?? null,
    source: log?.source ?? null,
    note: log?.note ?? null,
  }
}

// ─── Month register shapes (shared by month route + sync route) ──────────────

export interface MonthDayInfo {
  date: string
  dayOfWeek: number // 0 = Sunday
  isWeekend: boolean
}

export interface MonthRow {
  employeeId: string
  code: string
  name: string
  summary: {
    present: number
    late: number
    absent: number
    onLeave: number
    halfDays: number
    noRecord: number
    workedHours: number
  }
  byDate: Record<string, { status: string; checkIn: string | null; checkOut: string | null }>
}

/** Deterministic-ish pseudo-random in [0,1) seeded by two ints (matches seed style). */
export function prand(seed: number): number {
  const x = Math.sin(seed * 9973) * 10000
  return x - Math.floor(x)
}
