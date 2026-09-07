// GET /api/admin/plans — plan catalogue with live org counts
import { db } from "@/lib/db"
import { ok, fail, requireSuperAdmin, isResponse } from "@/lib/api-utils"
import { PLANS } from "@/lib/features"

export async function GET() {
  const guard = await requireSuperAdmin()
  if (isResponse(guard)) return guard

  try {
    const grouped = await db.organization.groupBy({ by: ["planKey"], _count: true })
    const counts: Record<string, number> = {}
    for (const g of grouped) counts[g.planKey] = g._count

    return ok(
      PLANS.map((plan) => ({
        key: plan.key,
        nameBn: plan.nameBn,
        nameEn: plan.nameEn,
        priceBdt: plan.priceBdt,
        maxEmployees: plan.maxEmployees,
        features: plan.features,
        taglineBn: plan.taglineBn,
        taglineEn: plan.taglineEn,
        highlight: plan.highlight ?? false,
        orgsCount: counts[plan.key] ?? 0,
      })),
    )
  } catch {
    return fail("failed to load plans", 500)
  }
}
