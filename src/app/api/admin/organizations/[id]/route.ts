// /api/admin/organizations/[id] — GET (detail + provisioning settle), PATCH, DELETE
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, fail, parseBody, requireSuperAdmin, isResponse, computeProvisionState } from "@/lib/api-utils"
import { logAudit, settleProvisioning, toOrgSummary } from "../../_lib/helpers"
import { defaultFlagsForPlan, FEATURE_MAP, PLANS } from "@/lib/features"

type Ctx = { params: Promise<{ id: string }> }

async function loadOrg(id: string) {
  return db.organization.findUnique({
    where: { id },
    include: { _count: { select: { employees: true, users: true } } },
  })
}

// ─── GET: org detail; completes simulated provisioning after 12s ──────────────
export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireSuperAdmin()
  if (isResponse(guard)) return guard
  const actor = guard.user.email

  const { id } = await params
  if (!id) return fail("id required")

  try {
    const existing = await loadOrg(id)
    if (!existing) return fail("organization not found", 404)

    // Simulated ERPNext provisioning: flip to active after 12s + audit.
    // When settled, re-fetch so `_count` relations are included.
    const { settled } = await settleProvisioning(existing, actor)
    const org = settled ? ((await loadOrg(id)) ?? existing) : existing

    const [adminUser, flags] = await Promise.all([
      db.user.findFirst({
        where: { organizationId: org.id, role: "ORG_ADMIN" },
        select: { name: true, email: true },
      }),
      db.featureFlag.findMany({ where: { organizationId: org.id } }),
    ])

    const featureFlags: Record<string, boolean> = {}
    for (const f of flags) featureFlags[f.featureKey] = f.enabled

    return ok({
      org: toOrgSummary(org),
      provision: computeProvisionState(org),
      adminUser,
      employeesCount: org._count.employees,
      featureFlags,
    })
  } catch (err) {
    console.error("[admin] GET organization failed:", err)
    return fail("failed to load organization", 500)
  }
}

// ─── PATCH: name / planKey / status / featureFlags (applied in this order) ────
interface PatchBody {
  name?: string
  planKey?: string
  status?: string
  featureFlags?: { featureKey: string; enabled: boolean }[]
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireSuperAdmin()
  if (isResponse(guard)) return guard
  const actor = guard.user.email

  const { id } = await params
  if (!id) return fail("id required")

  const body = await parseBody<PatchBody>(req)
  if (!body) return fail("invalid JSON body")

  if (
    body.name === undefined &&
    body.planKey === undefined &&
    body.status === undefined &&
    body.featureFlags === undefined
  ) {
    return fail("nothing to update")
  }

  try {
    const org = await db.organization.findUnique({ where: { id } })
    if (!org) return fail("organization not found", 404)

    // 1) name
    if (typeof body.name === "string" && body.name.trim() !== org.name) {
      const name = body.name.trim()
      if (name.length < 2) return fail("name must be at least 2 characters")
      await db.organization.update({ where: { id }, data: { name } })
      await logAudit({
        organizationId: id,
        actor,
        action: "org.updated",
        targetType: "organization",
        targetId: id,
        details: `name → ${name}`,
      })
    }

    // 2) planKey — resets feature flags to plan defaults
    if (typeof body.planKey === "string" && body.planKey !== org.planKey) {
      if (!PLANS.some((p) => p.key === body.planKey)) return fail("invalid planKey")
      const newPlan = body.planKey
      const flags = defaultFlagsForPlan(newPlan)
      flags.hr_core = true
      await db.$transaction([
        db.featureFlag.deleteMany({ where: { organizationId: id } }),
        db.organization.update({ where: { id }, data: { planKey: newPlan } }),
      ])
      await db.featureFlag.createMany({
        data: Object.entries(flags).map(([featureKey, enabled]) => ({
          organizationId: id,
          featureKey,
          enabled,
        })),
      })
      await logAudit({
        organizationId: id,
        actor,
        action: "plan.changed",
        targetType: "organization",
        targetId: id,
        details: `${org.planKey} → ${newPlan}`,
      })
    }

    // 3) status
    if (typeof body.status === "string" && body.status !== org.status) {
      if (body.status !== "active" && body.status !== "suspended") {
        return fail("status must be 'active' or 'suspended'")
      }
      await db.organization.update({ where: { id }, data: { status: body.status } })
      await logAudit({
        organizationId: id,
        actor,
        action: body.status === "suspended" ? "org.suspended" : "org.activated",
        targetType: "organization",
        targetId: id,
        details: org.name,
      })
    }

    // 4) featureFlags — hr_core can never be disabled
    if (Array.isArray(body.featureFlags)) {
      for (const flag of body.featureFlags) {
        if (typeof flag.featureKey !== "string" || typeof flag.enabled !== "boolean") {
          return fail("featureFlags items must be { featureKey, enabled }")
        }
        if (!FEATURE_MAP[flag.featureKey]) return fail(`unknown feature: ${flag.featureKey}`)
        if (flag.featureKey === "hr_core" && flag.enabled === false) {
          return fail("hr_core cannot be disabled")
        }
      }
      for (const flag of body.featureFlags) {
        await db.featureFlag.upsert({
          where: { organizationId_featureKey: { organizationId: id, featureKey: flag.featureKey } },
          create: { organizationId: id, featureKey: flag.featureKey, enabled: flag.enabled },
          update: { enabled: flag.enabled },
        })
        await logAudit({
          organizationId: id,
          actor,
          action: flag.enabled ? "feature.enabled" : "feature.disabled",
          targetType: "feature",
          targetId: flag.featureKey,
          details: `${flag.featureKey} → ${flag.enabled ? "ON" : "OFF"}`,
        })
      }
    }

    // Return fresh state
    const updated = await loadOrg(id)
    if (!updated) return fail("organization not found", 404)
    const flags = await db.featureFlag.findMany({ where: { organizationId: id } })
    const featureFlags: Record<string, boolean> = {}
    for (const f of flags) featureFlags[f.featureKey] = f.enabled

    return ok({
      org: toOrgSummary(updated),
      provision: computeProvisionState(updated),
      featureFlags,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    return fail(`failed to update organization: ${message}`, 500)
  }
}

// ─── DELETE: remove org (cascades), audit BEFORE delete (orgId SetNull) ──────
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireSuperAdmin()
  if (isResponse(guard)) return guard
  const actor = guard.user.email

  const { id } = await params
  if (!id) return fail("id required")

  try {
    const org = await db.organization.findUnique({ where: { id } })
    if (!org) return fail("organization not found", 404)

    await logAudit({
      organizationId: id,
      actor,
      action: "org.deleted",
      targetType: "organization",
      targetId: id,
      details: org.name,
    })

    await db.organization.delete({ where: { id } })
    return ok({ id, deleted: true })
  } catch {
    return fail("failed to delete organization", 500)
  }
}
