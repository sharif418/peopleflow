"use client"

import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect } from "react"
import { useSessionStore } from "@/store/session"
import { LandingPage } from "@/components/landing/landing-page"
import { LoginView } from "@/components/auth/login-view"
import { Splash } from "@/components/shared/splash"
import { ImpersonationBanner } from "@/components/shared/impersonation-banner"

const AdminShell = dynamic(() => import("@/components/admin/AdminShell"))
const PortalShell = dynamic(() => import("@/components/portal/PortalShell"))

export default function Page() {
  const { status, user, view, setView, impersonating } = useSessionStore()

  // keep SPA view consistent with auth state
  useEffect(() => {
    if (status === "authenticated" && view !== "app") setView("app")
    if (status === "unauthenticated" && view === "app") setView("landing")
  }, [status, view, setView])

  if (status === "loading") {
    return <Splash />
  }

  if (status === "unauthenticated") {
    return (
      <AnimatePresence mode="wait">
        {view === "login" ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <LoginView onBack={() => setView("landing")} />
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <LandingPage onLogin={() => setView("login")} />
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  // authenticated
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ImpersonationBanner />
      <div className="flex flex-1 flex-col">
        {user?.role === "SUPER_ADMIN" && !impersonating ? <AdminShell /> : <PortalShell />}
      </div>
    </div>
  )
}
