// Attendance module — API response types, endpoints, query keys (Task 4-a owned)
export interface AttendanceDayItem {
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

export interface AttendanceDayData {
  date: string
  isWeekend: boolean
  stats: {
    present: number
    late: number
    absent: number
    onLeave: number
    halfDay: number
    noRecord: number
  }
  items: AttendanceDayItem[]
}

export interface MonthDay {
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

export interface AttendanceMonthData {
  month: string
  days: MonthDay[]
  rows: MonthRow[]
  totals: { present: number; late: number; absent: number; onLeave: number }
}

export interface DeviceRow {
  id: string
  name: string
  serialNo: string
  model: string
  location: string | null
  ipAddress: string | null
  status: string // online | offline
  lastSyncAt: string | null
  todayPunches: number
}

export interface DevicesData {
  date: string
  items: DeviceRow[]
}

export interface SyncResult {
  syncedCount: number
  date: string
  mode: "full" | "missing"
  device: {
    id: string
    name: string
    serialNo: string
    model: string
    status: string
    lastSyncAt: string
  }
  log: AttendanceDayItem[]
}

export const ATT_ENDPOINTS = {
  day: "/api/org/attendance",
  month: "/api/org/attendance/month",
  sync: "/api/org/attendance/sync",
  devices: "/api/org/attendance/devices",
} as const

export const attendanceKeys = {
  devices: ["org", "attendance", "devices"] as const,
  day: (date: string) => ["org", "attendance", "day", date] as const,
  month: (month: string) => ["org", "attendance", "month", month] as const,
}

/** Client-local YYYY-MM-DD (avoids UTC off-by-one). */
export function localIsoToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Client-local YYYY-MM of today. */
export function currentMonth(): string {
  return localIsoToday().slice(0, 7)
}
