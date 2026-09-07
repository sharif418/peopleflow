import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { getSessionContext, setImpersonationCookie } from "@/lib/auth"
import { ok, fail, parseBody } from "@/lib/api-utils"

// Super Admin → impersonate an organization (enters org portal)
export async function POST(req: NextRequest) {
  const ctx = await getSessionContext()
  if (!ctx.user || ctx.user.role !== "SUPER_ADMIN" || ctx.impersonating) {
    return fail("forbidden", 403)
  }
  const body = await parseBody<{ orgId?: string }>(req)
  if (!body?.orgId) return fail("orgId required")

  const org = await db.organization.findUnique({ where: { id: body.orgId } })
  if (!org) return fail("organization not found", 404)

  await setImpersonationCookie(org.id)
  await db.auditLog.create({
    data: {
      organizationId: org.id,
      actor: ctx.user.email,
      action: "org.impersonated",
      targetType: "organization",
      targetId: org.id,
      details: org.name,
    },
  })
  return ok({ orgId: org.id, orgName: org.name })
}
