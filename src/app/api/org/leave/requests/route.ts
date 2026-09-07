// GET /api/org/leave/requests — paginated inbox (12/page), pending-first,
//   with per-request computed fields (overlap / balance) + org summary counts.
// POST /api/org/leave/requests — create a pending request (weekend-aware, validated)
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../_lib/helpers"
import {
  LEAVE_REQUEST_INCLUDE,
  activeLeaveRequests,
  balanceExcludingSelf,
  buildUsageIndex,
  calendarSpan,
  countWorkingDays,
  hasOverlap,
  isoOf,
  parseWeekend,
  rangesOverlap,
  todayIso,
} from "../_lib/helpers"
import { leaveRequestCreateSchema, zodLeaveError } from "../_lib/schemas"

const PAGE_SIZE = 12
const STATUS_VALUES = new Set(["pending", "approved", "rejected", "cancelled"])

function sameLocalDay(a: Date, b: Date): boolean {
  return isoOf(a) === isoOf(b)
}

function sameLocalMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const statusParam = (searchParams.get("status") ?? "").trim()
  const employeeId = searchParams.get("employeeId")?.trim() ?? ""
  const q = searchParams.get("q")?.trim() ?? ""
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  const statusList = statusParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => STATUS_VALUES.has(s))

  const where: Prisma.LeaveRequestWhereInput = { organizationId: guard.org.id }
  if (statusList.length > 0) where.status = { in: statusList }
  if (employeeId) where.employeeId = employeeId
  if (q) {
    where.OR = [
      { reason: { contains: q } },
      {
        employee: {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { employeeCode: { contains: q } },
          ],
        },
      },
    ]
  }

  try {
    const [rows, actives, allRequests, totalTypes] = await Promise.all([
      db.leaveRequest.findMany({
        where,
        include: LEAVE_REQUEST_INCLUDE,
        orderBy: { createdAt: "desc" },
      }),
      activeLeaveRequests(guard.org.id),
      db.leaveRequest.findMany({
        where: { organizationId: guard.org.id },
        select: { status: true, fromDate: true, toDate: true, employeeId: true, reviewedAt: true },
      }),
      db.leaveType.count({ where: { organizationId: guard.org.id } }),
    ])

    // Pending first (stable), then createdAt desc (Prisma order preserved within groups).
    const sorted = [
      ...rows.filter((r) => r.status === "pending"),
      ...rows.filter((r) => r.status !== "pending"),
    ]
    const total = sorted.length
    const safePage = Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)))
    const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

    const usage = buildUsageIndex(actives)
    const today = todayIso()
    const now = new Date()

    const items = pageItems.map((r) => {
      const balanceAvailable = balanceExcludingSelf(
        usage,
        r.employeeId,
        r.leaveTypeId,
        r.fromDate.slice(0, 4),
        { status: r.status, days: r.days },
        r.leaveType.daysPerYear,
      )
      return {
        ...r,
        overlapsExisting: hasOverlap(actives, r.employeeId, r.id, r.fromDate, r.toDate),
        exceedsBalance: r.days > balanceAvailable,
        balanceAvailable,
      }
    })

    // Org-wide summary (independent of filters).
    let pending = 0
    let approvedToday = 0
    let approvedMonth = 0
    let rejectedMonth = 0
    const onLeaveToday = new Set<string>()
    for (const r of allRequests) {
      if (r.status === "pending") pending++
      if (r.status === "approved") {
        if (r.fromDate <= today && today <= r.toDate) onLeaveToday.add(r.employeeId)
        if (r.reviewedAt && sameLocalDay(r.reviewedAt, now)) approvedToday++
        if (r.reviewedAt && sameLocalMonth(r.reviewedAt, now)) approvedMonth++
      }
      if (r.status === "rejected" && r.reviewedAt && sameLocalMonth(r.reviewedAt, now)) rejectedMonth++
    }

    return ok({
      items,
      total,
      page: safePage,
      pageSize: PAGE_SIZE,
      summary: { pending, approvedToday, approvedMonth, onLeaveToday: onLeaveToday.size, rejectedMonth, totalTypes },
    })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = leaveRequestCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodLeaveError(parsed.error), 400)
  const data = parsed.data

  const [employee, leaveType] = await Promise.all([
    db.employee.findFirst({
      where: { id: data.employeeId, organizationId: guard.org.id },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    }),
    db.leaveType.findFirst({
      where: { id: data.leaveTypeId, organizationId: guard.org.id },
    }),
  ])
  if (!employee) return fail("invalid_employee", 400)
  if (!leaveType) return fail("invalid_leave_type", 400)

  if (data.toDate < data.fromDate) return fail("invalid_range", 400)

  const today = todayIso()
  const yesterday = isoOf(new Date(Date.now() - 86_400_000))
  if (data.fromDate < yesterday) return fail("past_date", 400)

  const span = calendarSpan(data.fromDate, data.toDate)
  if (span > 90) return fail("span_too_long", 400)

  const weekend = parseWeekend(guard.org.weekendConfig)
  const days = countWorkingDays(data.fromDate, data.toDate, weekend)
  if (days < 0) return fail("invalid_range", 400)
  if (days === 0) return fail("weekend_only", 400)

  const actives = await activeLeaveRequests(guard.org.id)
  const overlap = actives.some(
    (r) =>
      r.employeeId === employee.id &&
      (r.status === "pending" || r.status === "approved") &&
      rangesOverlap(data.fromDate, data.toDate, r.fromDate, r.toDate),
  )
  if (overlap) return fail("overlap", 409)

  const usage = buildUsageIndex(actives)
  const balance = balanceExcludingSelf(
    usage,
    employee.id,
    leaveType.id,
    data.fromDate.slice(0, 4),
    { status: "none", days: 0 },
    leaveType.daysPerYear,
  )
  if (days > balance) return fail("insufficient_balance", 409)

  try {
    const created = await db.leaveRequest.create({
      data: {
        organizationId: guard.org.id,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        fromDate: data.fromDate,
        toDate: data.toDate,
        days,
        reason: data.reason ?? null,
        status: "pending",
      },
      include: LEAVE_REQUEST_INCLUDE,
    })
    await audit(
      guard,
      "leave.requested",
      "leave_request",
      created.id,
      `${employee.employeeCode} ${employee.firstName} ${employee.lastName} — ${leaveType.name} ${days}d`,
    )
    return ok({ ...created, overlapsExisting: false, exceedsBalance: false, balanceAvailable: balance }, 201)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("conflict", 409)
    return fail("create_failed", 500)
  }
}
