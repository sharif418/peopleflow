"use client"

// Admin layout chrome — wraps all /admin pages: sidebar + topbar + footer.
// The org-detail dialog lives here so provisioning polls survive route changes.
import { useState } from "react"
import { useSessionStore } from "@/store/session"
import { useAdminUiStore } from "@/store/admin-ui"
import { AppFooter } from "@/components/shared/app-footer"
import { AdminSidebarContent, AdminTopbar } from "@/components/admin/admin-sidebar"
import { OrgDetailDialog } from "@/components/admin/org-detail-dialog"
import type { SessionOrg, SessionUser } from "@/lib/types"

export interface InitialSession {
  user: SessionUser
  org: SessionOrg | null
  impersonating: boolean
}

/**
 * Seeds the Zustand session store synchronously on first mount so client
 * components see user/org data without a flash (server layout already guarded).
 */
function SessionSeed({ initial }: { initial: InitialSession }) {
  useState(() => {
    const s = useSessionStore.getState()
    if (s.status === "loading" || s.user?.id !== initial.user.id) {
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

export function AdminChrome({
  initial,
  children,
}: {
  initial: InitialSession
  children: React.ReactNode
}) {
  const detailOrgId = useAdminUiStore((s) => s.detailOrgId)
  const closeOrg = useAdminUiStore((s) => s.closeOrg)

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <SessionSeed initial={initial} />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <AdminSidebarContent />
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-6">{children}</main>
          <AppFooter />
        </div>
      </div>

      {/* Org detail dialog at layout level — survives route changes while open */}
      {detailOrgId && <OrgDetailDialog orgId={detailOrgId} onClose={closeOrg} />}
    </div>
  )
}
