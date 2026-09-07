"use client"

// Portal layout chrome — wraps all /portal/[orgId] pages: sidebar + topbar +
// footer + setup wizard gate + impersonation banner.
import { useState } from "react"
import { useSessionStore } from "@/store/session"
import { AppFooter } from "@/components/shared/app-footer"
import { ImpersonationBanner } from "@/components/shared/impersonation-banner"
import { PortalSidebarContent, PortalTopbar } from "@/components/portal/portal-sidebar"
import { SetupWizard } from "@/components/portal/setup-wizard"
import type { SessionOrg, SessionUser } from "@/lib/types"

export interface InitialSession {
  user: SessionUser
  org: SessionOrg
  impersonating: boolean
}

/**
 * Seeds the Zustand session store synchronously on first mount (server layout
 * already validated the session and org).
 */
function SessionSeed({ initial }: { initial: InitialSession }) {
  useState(() => {
    const s = useSessionStore.getState()
    if (s.status === "loading" || s.org?.id !== initial.org.id) {
      useSessionStore.setState({
        status: "authenticated",
        user: initial.user,
        org: initial.org,
        impersonating: initial.impersonating,
      })
    }
    return true
  })
  return null
}

export function PortalChrome({
  initial,
  children,
}: {
  initial: InitialSession
  children: React.ReactNode
}) {
  const { org, status } = useSessionStore()
  const [wizardDismissed, setWizardDismissed] = useState(false)
  const [wizardKeep, setWizardKeep] = useState(false)

  const liveOrg = org ?? initial.org
  // The wizard stays mounted after completion (success screen) until the user
  // explicitly goes to the dashboard or skips — `wizardKeep` guards against the
  // session refresh flipping `setupCompleted` and unmounting it mid-celebration.
  const showWizard = status === "authenticated" && !wizardDismissed && (wizardKeep || !liveOrg.setupCompleted)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SessionSeed initial={initial} />
      <ImpersonationBanner />
      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <PortalSidebarContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <PortalTopbar />
          <main id="main-content" className="flex-1">
            {showWizard ? (
              <SetupWizard
                onSkip={() => setWizardDismissed(true)}
                onCompleted={() => setWizardKeep(true)}
                onDone={() => setWizardDismissed(true)}
              />
            ) : (
              <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">{children}</div>
            )}
          </main>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}
