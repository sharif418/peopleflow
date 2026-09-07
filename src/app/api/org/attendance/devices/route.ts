// GET /api/org/attendance/devices — org devices + today's device-source punch counts
// POST /api/org/attendance/devices — register a new biometric device
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../_lib/helpers"
import { localIsoDate } from "../_lib/attendance"
import { deviceCreateSchema, zodError } from "../_lib/schemas"

export async function GET() {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  try {
    const today = localIsoDate()
    const [devices, counts] = await Promise.all([
      db.device.findMany({
        where: { organizationId: guard.org.id },
        orderBy: { createdAt: "asc" },
      }),
      db.attendanceLog.groupBy({
        by: ["deviceId"],
        where: {
          organizationId: guard.org.id,
          date: today,
          source: "device",
          deviceId: { not: null },
        },
        _count: { _all: true },
      }),
    ])
    const countMap = new Map(counts.map((c) => [c.deviceId, c._count._all]))

    const items = devices.map((d) => ({
      id: d.id,
      name: d.name,
      serialNo: d.serialNo,
      model: d.model,
      location: d.location,
      ipAddress: d.ipAddress,
      status: d.status,
      lastSyncAt: d.lastSyncAt,
      todayPunches: countMap.get(d.id) ?? 0,
    }))
    return ok({ date: today, items })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = deviceCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const data = parsed.data

  try {
    const device = await db.device.create({
      data: {
        organizationId: guard.org.id,
        name: data.name,
        serialNo: data.serialNo,
        model: data.model ?? "ZKTeco K40",
        location: data.location ?? null,
        ipAddress: data.ipAddress ?? null,
        status: "online",
      },
    })

    await audit(
      guard,
      "device.created",
      "device",
      device.id,
      `${device.name} · ${device.serialNo} · ${device.model}`,
    )
    return ok(device, 201)
  } catch (x) {
    if (isPrismaKnownError(x) && x.code === "P2002") return fail("serial_taken", 409)
    return fail("create_failed", 500)
  }
}
