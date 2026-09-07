import { db } from "@/lib/db"
import { clearSessionCookies, getSessionContext } from "@/lib/auth"
import { ok } from "@/lib/api-utils"

export async function POST() {
  const ctx = await getSessionContext()
  if (ctx.user) {
    await db.auditLog.create({
      data: { organizationId: ctx.orgId, actor: ctx.user.email, action: "auth.logout" },
    })
  }
  await clearSessionCookies()
  return ok({ loggedOut: true })
}
