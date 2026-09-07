// /api/admin/organizations — GET (list with q/status filters) + POST (create tenant)
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, fail, parseBody, requireSuperAdmin, isResponse } from "@/lib/api-utils"
import { computeProvisionState } from "@/lib/api-utils"
import { logAudit, toOrgSummary } from "../_lib/helpers"
import { defaultFlagsForPlan, FEATURES, PLANS, PLAN_MAP } from "@/lib/features"
import { hashPassword } from "@/lib/crypto"

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim()
  const status = searchParams.get("status") ?? ""

  try {
    // Fetch with status filter; apply q filter in JS for case-insensitive matching
    // (SQLite `contains` is case-sensitive, dataset is small).
    const orgs = await db.organization.findMany({
      where:
        status === "active" || status === "suspended" || status === "provisioning" ? { status } : {},
      include: { _count: { select: { employees: true, users: true } } },
      orderBy: { createdAt: "desc" },
    })

    const filtered = q
      ? orgs.filter(
          (o) =>
            o.name.toLowerCase().includes(q) || o.subdomain.toLowerCase().includes(q),
        )
      : orgs

    return ok(
      filtered.map((org) => ({
        ...toOrgSummary(org),
        provision: computeProvisionState(org),
      })),
    )
  } catch {
    return fail("failed to list organizations", 500)
  }
}

const SUBDOMAIN_RE = /^[a-z0-9-]{3,30}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface CreateOrgBody {
  name?: string
  subdomain?: string
  planKey?: string
  adminName?: string
  adminEmail?: string
  adminPassword?: string
}

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin()
  if (isResponse(guard)) return guard
  const actor = guard.user.email

  const body = await parseBody<CreateOrgBody>(req)
  if (!body) return fail("invalid JSON body")

  const name = (body.name ?? "").trim()
  const subdomain = (body.subdomain ?? "").trim().toLowerCase()
  const planKey = (body.planKey ?? "").trim()
  const adminName = (body.adminName ?? "").trim()
  const adminEmail = (body.adminEmail ?? "").trim().toLowerCase()
  const adminPassword = body.adminPassword ?? ""

  if (name.length < 2) return fail("name must be at least 2 characters")
  if (!SUBDOMAIN_RE.test(subdomain)) {
    return fail("subdomain must be 3–30 chars of lowercase letters, numbers & hyphens")
  }
  if (!PLANS.some((p) => p.key === planKey)) return fail("invalid planKey")
  if (adminName.length < 2) return fail("adminName must be at least 2 characters")
  if (!EMAIL_RE.test(adminEmail)) return fail("adminEmail is not a valid email")
  if (adminPassword.length < 6) return fail("adminPassword must be at least 6 characters")

  try {
    const [subdomainTaken, emailTaken] = await Promise.all([
      db.organization.findUnique({ where: { subdomain } }),
      db.user.findUnique({ where: { email: adminEmail } }),
    ])
    if (subdomainTaken) return fail(`subdomain "${subdomain}" is already taken`, 409)
    if (emailTaken) return fail(`email "${adminEmail}" is already registered`, 409)

    const plan = PLAN_MAP[planKey]
    const flags = defaultFlagsForPlan(planKey)
    flags.hr_core = true // core HR is always on

    const period = (() => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    })()

    const created = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          subdomain,
          siteName: `${subdomain}.peopleflow.com`,
          status: "provisioning",
          provisionStartedAt: new Date(),
          setupCompleted: false,
          planKey,
        },
      })

      await tx.featureFlag.createMany({
        data: FEATURES.map((f) => ({
          organizationId: org.id,
          featureKey: f.key,
          enabled: flags[f.key] ?? false,
        })),
      })

      await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          passwordHash: hashPassword(adminPassword),
          role: "ORG_ADMIN",
          organizationId: org.id,
        },
      })

      await tx.invoice.create({
        data: {
          organizationId: org.id,
          amount: plan.priceBdt,
          period,
          status: "pending",
        },
      })

      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          actor,
          action: "org.created",
          targetType: "organization",
          targetId: org.id,
          details: `${name} (${plan.nameEn})`,
        },
      })

      return org
    })

    return ok(
      {
        ...toOrgSummary(created),
        provision: computeProvisionState(created),
      },
      201,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    return fail(`failed to create organization: ${message}`, 500)
  }
}
