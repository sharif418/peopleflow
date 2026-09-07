// Shared server helpers for /api/admin/* routes (private folder — not routable)
import { db } from "@/lib/db"
import { PLAN_MAP } from "@/lib/features"
import { computeProvisionState, type ProvisionState } from "@/lib/api-utils"
import type { Organization } from "@prisma/client"
import type { OrganizationSummary } from "@/lib/types"

type OrgWithCounts = Organization & {
  _count?: { employees: number; users: number }
}

/** Map a Prisma org (optionally with _count) to the API OrganizationSummary contract. */
export function toOrgSummary(org: OrgWithCounts): OrganizationSummary {
  const plan = PLAN_MAP[org.planKey]
  return {
    id: org.id,
    name: org.name,
    subdomain: org.subdomain,
    siteName: org.siteName,
    status: org.status as OrganizationSummary["status"],
    planKey: org.planKey,
    setupCompleted: org.setupCompleted,
    employeesCount: org._count?.employees ?? 0,
    usersCount: org._count?.users ?? 0,
    mrr: org.status === "active" && plan ? plan.priceBdt : 0,
    createdAt: org.createdAt.toISOString(),
    provisionStartedAt: org.provisionStartedAt?.toISOString() ?? null,
  }
}

export async function logAudit(entry: {
  organizationId: string | null
  actor: string
  action: string
  targetType?: string
  targetId?: string
  details?: string
}) {
  await db.auditLog.create({
    data: {
      organizationId: entry.organizationId,
      actor: entry.actor,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      details: entry.details,
    },
  })
}

/**
 * Simulated ERPNext provisioning completion: when a `provisioning` org has been
 * running longer than 12s, flip it to active (race-safe via updateMany).
 * Returns the (possibly updated) org WITHOUT relations — re-fetch for counts.
 */
export async function settleProvisioning(
  org: Organization,
  actor: string,
): Promise<{ org: Organization; settled: boolean }> {
  if (org.status !== "provisioning") return { org, settled: false }
  const started = org.provisionStartedAt?.getTime() ?? 0
  if (Date.now() - started <= 12000) return { org, settled: false }
  const res = await db.organization.updateMany({
    where: { id: org.id, status: "provisioning" },
    data: { status: "active" },
  })
  if (res.count === 0) return { org: { ...org, status: "active" }, settled: false }
  await logAudit({
    organizationId: org.id,
    actor,
    action: "org.provisioned",
    targetType: "organization",
    targetId: org.id,
    details: org.name,
  })
  const updated = await db.organization.findUnique({ where: { id: org.id } })
  return { org: updated ?? { ...org, status: "active" }, settled: true }
}

export function provisionOf(org: Organization): ProvisionState {
  return computeProvisionState(org)
}
