// GET /api/org/leave/types — list with usage counts
// POST /api/org/leave/types — create a leave type (unique name per org)
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../_lib/helpers"
import { todayIso } from "../_lib/helpers"
import { leaveTypeCreateSchema, zodLeaveError } from "../_lib/schemas"

export async function GET() {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  try {
    const [types, requests] = await Promise.all([
      db.leaveType.findMany({
        where: { organizationId: guard.org.id },
        orderBy: { createdAt: "asc" },
      }),
      db.leaveRequest.findMany({
        where: { organizationId: guard.org.id },
        select: { leaveTypeId: true, status: true, fromDate: true, toDate: true, employeeId: true },
      }),
    ])

    const today = todayIso()
    const items = types.map((t) => {
      let approvedRequests = 0
      let pendingRequests = 0
      const onLeaveToday = new Set<string>()
      for (const r of requests) {
        if (r.leaveTypeId !== t.id) continue
        if (r.status === "approved") {
          approvedRequests++
          if (r.fromDate <= today && today <= r.toDate) onLeaveToday.add(r.employeeId)
        } else if (r.status === "pending") {
          pendingRequests++
        }
      }
      return { ...t, approvedRequests, pendingRequests, employeesOnLeaveToday: onLeaveToday.size }
    })

    return ok({ items })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = leaveTypeCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodLeaveError(parsed.error), 400)
  const data = parsed.data

  const clash = await db.leaveType.findFirst({
    where: { organizationId: guard.org.id, name: data.name },
    select: { id: true },
  })
  if (clash) return fail("name_taken", 409)

  try {
    const created = await db.leaveType.create({
      data: {
        organizationId: guard.org.id,
        name: data.name,
        daysPerYear: data.daysPerYear,
        isPaid: data.isPaid,
        carryForward: data.carryForward,
      },
    })
    await audit(guard, "leave_type.created", "leave_type", created.id, `${created.name} (${created.daysPerYear}d)`)
    return ok(created, 201)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("name_taken", 409)
    return fail("create_failed", 500)
  }
}
