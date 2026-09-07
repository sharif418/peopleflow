// PATCH /api/org/attendance/devices/[id] — rename / update device info or status
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit } from "../../../_lib/helpers"
import { devicePatchSchema, zodError } from "../../_lib/schemas"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard
  const { id } = await params

  const existing = await db.device.findFirst({
    where: { id, organizationId: guard.org.id },
  })
  if (!existing) return fail("device_not_found", 404)

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = devicePatchSchema.safeParse(body)
  if (!parsed.success) return fail(zodError(parsed.error), 400)
  const data = parsed.data

  try {
    const update: Record<string, unknown> = {}
    if (data.name !== undefined) update.name = data.name
    if (data.location !== undefined) update.location = data.location ?? null
    if (data.ipAddress !== undefined) update.ipAddress = data.ipAddress ?? null
    if (data.status !== undefined) update.status = data.status

    const updated = await db.device.update({ where: { id }, data: update })

    await audit(guard, "device.updated", "device", id, `${updated.name} · ${updated.status}`)
    return ok(updated)
  } catch {
    return fail("update_failed", 500)
  }
}
