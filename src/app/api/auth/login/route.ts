import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/crypto"
import { setSessionCookie, clearSessionCookies } from "@/lib/auth"
import { ok, fail, parseBody } from "@/lib/api-utils"
import type { SessionOrg } from "@/lib/types"

// simple in-memory rate limiting (per email, 10 attempts / 10 min)
const attempts = new Map<string, { count: number; resetAt: number }>()

function rateLimited(email: string): boolean {
  const now = Date.now()
  const entry = attempts.get(email)
  if (!entry || entry.resetAt < now) {
    attempts.set(email, { count: 1, resetAt: now + 10 * 60 * 1000 })
    return false
  }
  entry.count += 1
  return entry.count > 10
}

export async function POST(req: NextRequest) {
  const body = await parseBody<{ email?: string; password?: string }>(req)
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password
  if (!email || !password) return fail("email and password required")

  if (rateLimited(email)) {
    return fail("অনেকবার ভুল চেষ্টা হয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন", 429)
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return fail("invalid credentials", 401)
  }

  await clearSessionCookies() // fresh session (also clears impersonation)
  await setSessionCookie(user.id)

  await db.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actor: user.email,
      action: "auth.login",
      targetType: "user",
      targetId: user.id,
    },
  })

  let org: SessionOrg | null = null
  if (user.organizationId) {
    const dbOrg = await db.organization.findUnique({ where: { id: user.organizationId } })
    if (dbOrg) {
      const flags = await db.featureFlag.findMany({ where: { organizationId: dbOrg.id } })
      const featureFlags: Record<string, boolean> = {}
      for (const f of flags) featureFlags[f.featureKey] = f.enabled
      org = {
        id: dbOrg.id,
        name: dbOrg.name,
        subdomain: dbOrg.subdomain,
        siteName: dbOrg.siteName,
        status: dbOrg.status as SessionOrg["status"],
        planKey: dbOrg.planKey,
        setupCompleted: dbOrg.setupCompleted,
        featureFlags,
      }
    }
  }

  return ok({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    org,
    impersonating: false,
  })
}
