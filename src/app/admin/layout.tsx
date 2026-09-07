// /admin layout — server-side SUPER_ADMIN guard + app chrome
import { redirect } from "next/navigation"
import { getSessionContext } from "@/lib/auth"
import { AdminChrome } from "@/components/admin/admin-chrome"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext()
  if (!ctx.user) redirect("/login")
  if (ctx.user.role !== "SUPER_ADMIN" || ctx.impersonating) {
    // ORG_ADMIN (or impersonating super admin) belongs in the portal
    if (ctx.org) redirect(ctx.org.subdomain ? `/portal/${ctx.org.subdomain}` : `/portal/${ctx.org.id}`)
    redirect("/login")
  }

  return <AdminChrome initial={{ user: ctx.user, org: ctx.org, impersonating: false }}>{children}</AdminChrome>
}
