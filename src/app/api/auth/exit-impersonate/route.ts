import { db } from "@/lib/db"
import { getSessionContext, clearImpersonationCookie } from "@/lib/auth"
import { ok } from "@/lib/api-utils"

export async function POST() {
  const ctx = await getSessionContext()
  if (ctx.impersonating && ctx.user) {
    await db.auditLog.create({
      data: {
        organizationId: ctx.orgId,
        actor: ctx.user.email,
        action: "org.impersonation_exited",
      },
    })
  }
  await clearImpersonationCookie()
  return ok({ exited: true })
}
