// /login — credential login (redirects authenticated users to their app)
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionContext } from "@/lib/auth"
import { LoginView } from "@/components/auth/login-view"

export const metadata: Metadata = { title: "লগইন" }
export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const ctx = await getSessionContext()
  if (ctx.user) {
    if (ctx.user.role === "SUPER_ADMIN" && !ctx.impersonating) redirect("/admin")
    if (ctx.org) redirect(ctx.org.subdomain ? `/portal/${ctx.org.subdomain}` : `/portal/${ctx.org.id}`)
  }
  return <LoginView />
}
