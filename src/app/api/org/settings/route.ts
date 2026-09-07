// GET /api/org/settings — organization profile + config (read view)
// PATCH /api/org/settings — update address/contact/weekend/PF config (name & subdomain read-only)
import { z } from "zod"
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit } from "../_lib/helpers"

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s-]{7,19}$/

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v)

const settingsPatchSchema = z
  .object({
    address: z.preprocess(
      emptyToNull,
      z.string().trim().max(200, "address_too_long").nullable().optional(),
    ),
    contactPhone: z.preprocess(
      emptyToNull,
      z.string().trim().max(20).regex(PHONE_RE, "invalid_phone").nullable().optional(),
    ),
    contactEmail: z.preprocess(
      emptyToNull,
      z.string().trim().max(120).regex(EMAIL_RE, "invalid_email").nullable().optional(),
    ),
    weekendConfig: z
      .array(z.enum(DAY_KEYS))
      .max(7)
      .refine((days) => new Set(days).size === days.length, "duplicate_days")
      .optional(),
    pfEnabled: z.boolean().optional(),
    pfPercent: z.number().int().min(0).max(30).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "empty" })

function serialize(
  org: {
    name: string
    subdomain: string
    address: string | null
    contactPhone: string | null
    contactEmail: string | null
    weekendConfig: string | null
    pfEnabled: boolean
    pfPercent: number
    planKey: string
    setupCompleted: boolean
    createdAt: Date
  },
  employeeCount: number,
) {
  const weekend = (org.weekendConfig ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => (DAY_KEYS as readonly string[]).includes(d))
  return {
    name: org.name,
    subdomain: org.subdomain,
    address: org.address,
    contactPhone: org.contactPhone,
    contactEmail: org.contactEmail,
    weekendConfig: weekend,
    pfEnabled: org.pfEnabled,
    pfPercent: org.pfPercent,
    planKey: org.planKey,
    employeeCount,
    setupCompleted: org.setupCompleted,
    createdAt: org.createdAt,
  }
}

export async function GET() {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  try {
    const employeeCount = await db.employee.count({ where: { organizationId: guard.org.id } })
    return ok(serialize(guard.org, employeeCount))
  } catch {
    return fail("load_failed", 500)
  }
}

export async function PATCH(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = settingsPatchSchema.safeParse(body)
  if (!parsed.success) {
    const parts = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}:${i.code}`)
    return fail(`validation_failed (${parts.join(", ")})`, 400)
  }
  const data = parsed.data

  const update: Record<string, string | number | boolean | null> = {}
  if (data.address !== undefined) update.address = data.address
  if (data.contactPhone !== undefined) update.contactPhone = data.contactPhone
  if (data.contactEmail !== undefined) update.contactEmail = data.contactEmail
  if (data.weekendConfig !== undefined) update.weekendConfig = data.weekendConfig.join(",")
  if (data.pfEnabled !== undefined) update.pfEnabled = data.pfEnabled
  if (data.pfPercent !== undefined) update.pfPercent = data.pfPercent

  try {
    const updated = await db.organization.update({ where: { id: guard.org.id }, data: update })
    const employeeCount = await db.employee.count({ where: { organizationId: guard.org.id } })

    await audit(
      guard,
      "settings.updated",
      "organization",
      guard.org.id,
      `changed: ${Object.keys(update).join(", ")}`,
    )

    return ok(serialize(updated, employeeCount))
  } catch {
    return fail("update_failed", 500)
  }
}
