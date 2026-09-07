// Route path builders — single source of truth for App Router navigation
import type { SessionOrg, SessionUser } from "@/lib/types"
import type { PortalSection } from "@/components/portal/types"

export type AdminSection = "overview" | "organizations" | "plans" | "health" | "audit"

export const ADMIN_SECTIONS: AdminSection[] = ["overview", "organizations", "plans", "health", "audit"]

export function adminPath(section: AdminSection): string {
  switch (section) {
    case "overview":
      return "/admin"
    case "organizations":
      return "/admin/organizations"
    case "plans":
      return "/admin/plans"
    case "health":
      return "/admin/health"
    case "audit":
      return "/admin/audit"
  }
}

/** URL segment for a portal section (dashboard → ""). */
export function portalSectionPath(section: PortalSection): string {
  if (section.startsWith("feature:")) return section.slice("feature:".length)
  switch (section) {
    case "dashboard":
      return ""
    case "employees":
    case "departments":
    case "designations":
    case "branches":
    case "shifts":
    case "settings":
    case "modules":
      return section
    default:
      return ""
  }
}

/** Absolute path for a portal section of an org (identified by subdomain or id). */
export function portalPath(orgKey: string, section: PortalSection): string {
  const seg = portalSectionPath(section)
  return seg ? `/portal/${orgKey}/${seg}` : `/portal/${orgKey}`
}

export function portalHome(orgKey: string): string {
  return `/portal/${orgKey}`
}

/**
 * Where a logged-in user should land.
 * SUPER_ADMIN (not impersonating) → /admin; otherwise their org portal.
 */
export function homePathFor(user: Pick<SessionUser, "role"> | null, org: SessionOrg | null, impersonating = false): string {
  if (!user) return "/login"
  if (user.role === "SUPER_ADMIN" && !impersonating) return "/admin"
  if (org) return portalHome(org.subdomain || org.id)
  return "/login"
}
