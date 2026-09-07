// Shared server helpers for /api/org/leave routes (Task 4-b owned)
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

// ─── Weekend config (Organization.weekendConfig, e.g. "friday,saturday") ─────

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

/** Parse the org weekend config into a set of JS day indexes (0=Sunday). Defaults to Fri+Sat. */
export function parseWeekend(weekendConfig: string | null): Set<number> {
  const parts = (weekendConfig ?? "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
  const set = new Set<number>()
  for (const p of parts) {
    const idx = DAY_NAME_TO_INDEX[p]
    if (idx !== undefined) set.add(idx)
  }
  return set.size > 0 ? set : new Set([5, 6])
}

// ─── ISO date helpers (YYYY-MM-DD, local timezone) ───────────────────────────

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(v: string): boolean {
  if (!ISO_RE.test(v)) return false
  return !Number.isNaN(new Date(`${v}T00:00:00`).getTime())
}

/** Local-calendar ISO date (YYYY-MM-DD) of a Date. */
export function isoOf(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function todayIso(): string {
  return isoOf(new Date())
}

/** Inclusive calendar-day span between two ISO dates. Returns -1 when to < from. */
export function calendarSpan(fromDate: string, toDate: string): number {
  const a = new Date(`${fromDate}T00:00:00`).getTime()
  const b = new Date(`${toDate}T00:00:00`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return -1
  return Math.round((b - a) / 86_400_000) + 1
}

/** ISO dates compare lexicographically — range overlap check is a plain string compare. */
export function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && bFrom <= aTo
}

/** Working days in an inclusive ISO range, excluding the org weekend. -1 when to < from. */
export function countWorkingDays(fromDate: string, toDate: string, weekend: Set<number>): number {
  const span = calendarSpan(fromDate, toDate)
  if (span < 0) return -1
  const start = new Date(`${fromDate}T00:00:00`)
  let working = 0
  for (let i = 0; i < span; i++) {
    const cursor = new Date(start.getTime() + i * 86_400_000)
    if (!weekend.has(cursor.getDay())) working++
  }
  return working
}

// ─── Request queries + computed fields ───────────────────────────────────────

export const LEAVE_REQUEST_INCLUDE = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      designation: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  },
  leaveType: true,
} satisfies Prisma.LeaveRequestInclude

interface MinimalRequest {
  id: string
  employeeId: string
  leaveTypeId: string
  status: string
  days: number
  fromDate: string
  toDate: string
}

export interface UsageEntry {
  approved: number
  pending: number
}

/** Usage index keyed `${employeeId}|${leaveTypeId}|${year}` from pending+approved requests. */
export function buildUsageIndex(requests: MinimalRequest[]): Map<string, UsageEntry> {
  const map = new Map<string, UsageEntry>()
  for (const r of requests) {
    if (r.status !== "approved" && r.status !== "pending") continue
    const key = `${r.employeeId}|${r.leaveTypeId}|${r.fromDate.slice(0, 4)}`
    const entry = map.get(key) ?? { approved: 0, pending: 0 }
    if (r.status === "approved") entry.approved += r.days
    else entry.pending += r.days
    map.set(key, entry)
  }
  return map
}

/** Usage entry for an employee+type+year (pending+approved days in that year). */
export function usageOf(
  usage: Map<string, UsageEntry>,
  employeeId: string,
  leaveTypeId: string,
  year: string,
): UsageEntry {
  return usage.get(`${employeeId}|${leaveTypeId}|${year}`) ?? { approved: 0, pending: 0 }
}

/**
 * Balance available for a request excluding its own contribution:
 * daysPerYear − approved − pending, where the request's own days are removed
 * from whichever bucket they currently sit in (pending/approved).
 * `selfStatus` is "none" for not-yet-created requests.
 */
export function balanceExcludingSelf(
  usage: Map<string, UsageEntry>,
  employeeId: string,
  leaveTypeId: string,
  year: string,
  self: { status: string; days: number },
  daysPerYear: number,
): number {
  const entry = usageOf(usage, employeeId, leaveTypeId, year)
  let approved = entry.approved
  let pending = entry.pending
  if (self.status === "approved") approved -= self.days
  if (self.status === "pending") pending -= self.days
  return daysPerYear - Math.max(0, approved) - Math.max(0, pending)
}

/** All pending+approved requests of the org (minimal fields) for overlap/usage math. */
export async function activeLeaveRequests(orgId: string): Promise<MinimalRequest[]> {
  return db.leaveRequest.findMany({
    where: { organizationId: orgId, status: { in: ["pending", "approved"] } },
    select: {
      id: true,
      employeeId: true,
      leaveTypeId: true,
      status: true,
      days: true,
      fromDate: true,
      toDate: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

/** Does this request overlap another pending/approved request of the same employee? */
export function hasOverlap(
  requests: MinimalRequest[],
  employeeId: string,
  id: string,
  from: string,
  to: string,
): boolean {
  return requests.some(
    (r) => r.id !== id && r.employeeId === employeeId && rangesOverlap(from, to, r.fromDate, r.toDate),
  )
}
