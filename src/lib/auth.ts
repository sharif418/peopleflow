// Session helpers — reads cookies, resolves users/orgs (server-side only)
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { signToken, verifyToken } from "@/lib/crypto"
import type { SessionUser, SessionOrg, OrgStatus } from "@/lib/types"
import type { User, Organization } from "@prisma/client"

export const SESSION_COOKIE = "pf_session"
export const IMPERSONATION_COOKIE = "pf_imp"
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export function createSessionToken(userId: string): string {
  return signToken(userId, SESSION_TTL_MS)
}

function toSessionUser(u: User): SessionUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role as SessionUser["role"] }
}

function toSessionOrg(o: Organization, flags: Record<string, boolean>): SessionOrg {
  return {
    id: o.id,
    name: o.name,
    subdomain: o.subdomain,
    siteName: o.siteName,
    status: o.status as OrgStatus,
    planKey: o.planKey,
    setupCompleted: o.setupCompleted,
    featureFlags: flags,
  }
}

async function flagsForOrg(orgId: string): Promise<Record<string, boolean>> {
  const rows = await db.featureFlag.findMany({ where: { organizationId: orgId } })
  const flags: Record<string, boolean> = {}
  for (const r of rows) flags[r.featureKey] = r.enabled
  return flags
}

export interface SessionContext {
  user: SessionUser | null
  org: SessionOrg | null
  impersonating: boolean
  /** when impersonating: the underlying super-admin user; otherwise same as user */
  realUser: SessionUser | null
  /** DB ids for API routes */
  userId: string | null
  orgId: string | null
}

export async function getSessionContext(): Promise<SessionContext> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  const userId = verifyToken(token)
  if (!userId) {
    return { user: null, org: null, impersonating: false, realUser: null, userId: null, orgId: null }
  }
  const dbUser = await db.user.findUnique({ where: { id: userId } })
  if (!dbUser) {
    return { user: null, org: null, impersonating: false, realUser: null, userId: null, orgId: null }
  }
  const realUser = toSessionUser(dbUser)

  // Impersonation (super admin only)
  const impToken = jar.get(IMPERSONATION_COOKIE)?.value
  const impOrgId = dbUser.role === "SUPER_ADMIN" ? verifyToken(impToken) : null

  if (impOrgId) {
    const org = await db.organization.findUnique({ where: { id: impOrgId } })
    if (org) {
      const impUser = await db.user.findFirst({
        where: { organizationId: org.id, role: "ORG_ADMIN" },
      })
      const effective = impUser
        ? toSessionUser(impUser)
        : ({ id: `imp-${org.id}`, email: `admin@${org.subdomain}.peopleflow.com`, name: `${org.name} Admin`, role: "ORG_ADMIN" as const })
      return {
        user: effective,
        realUser,
        org: toSessionOrg(org, await flagsForOrg(org.id)),
        impersonating: true,
        userId: realUser.id,
        orgId: org.id,
      }
    }
  }

  if (dbUser.organizationId) {
    const org = await db.organization.findUnique({ where: { id: dbUser.organizationId } })
    if (org) {
      return {
        user: realUser,
        realUser,
        org: toSessionOrg(org, await flagsForOrg(org.id)),
        impersonating: false,
        userId: dbUser.id,
        orgId: org.id,
      }
    }
  }
  return { user: realUser, realUser, org: null, impersonating: false, userId: dbUser.id, orgId: null }
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function clearSessionCookies() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  jar.delete(IMPERSONATION_COOKIE)
}

export async function setImpersonationCookie(orgId: string) {
  const jar = await cookies()
  jar.set(IMPERSONATION_COOKIE, signToken(orgId, 1000 * 60 * 60 * 2), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7200,
  })
}

export async function clearImpersonationCookie() {
  const jar = await cookies()
  jar.delete(IMPERSONATION_COOKIE)
}
