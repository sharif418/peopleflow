// /portal/[orgId] layout — server-side org-context guard + portal chrome.
// orgId accepts the org subdomain (canonical, e.g. "akash") or its database id.
import { redirect } from "next/navigation"
import { getSessionContext } from "@/lib/auth"
import { PortalChrome } from "@/components/portal/portal-chrome"

export const dynamic = "force-dynamic"

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  const ctx = await getSessionContext()

  if (!ctx.user) redirect("/login")

  if (!ctx.orgId || !ctx.org) {
    // Super admin not impersonating has no org context → admin panel
    if (ctx.user.role === "SUPER_ADMIN" && !ctx.impersonating) redirect("/admin")
    redirect("/login")
  }

  const org = ctx.org
  // Canonicalize: accept id, redirect to subdomain form when possible
  if (orgId !== org.subdomain && orgId !== org.id) {
    if (ctx.user.role === "SUPER_ADMIN" && !ctx.impersonating) redirect("/admin")
    redirect(org.subdomain ? `/portal/${org.subdomain}` : `/portal/${org.id}`)
  }
  if (orgId === org.id && org.subdomain) {
    redirect(`/portal/${org.subdomain}`)
  }

  return (
    <PortalChrome initial={{ user: ctx.user, org, impersonating: ctx.impersonating }}>{children}</PortalChrome>
  )
}
