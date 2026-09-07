"use client"

// Super Admin shell — sidebar + topbar + section views (SPA, no routing)
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
} from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { PeopleFlowLogo } from "@/components/shared/peopleflow-logo"
import { LangToggle } from "@/components/shared/lang-toggle"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { AppFooter } from "@/components/shared/app-footer"
import { useSessionStore } from "@/store/session"
import { useI18n } from "@/lib/i18n"
import { initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { OverviewView } from "./overview-view"
import { OrgsView } from "./orgs-view"
import { PlansView } from "./plans-view"
import { HealthView } from "./health-view"
import { AuditView } from "./audit-view"
import { OrgDetailDialog } from "./org-detail-dialog"

type SectionKey = "overview" | "organizations" | "plans" | "health" | "audit"

const NAV_ITEMS: { key: SectionKey; icon: typeof LayoutDashboard }[] = [
  { key: "overview", icon: LayoutDashboard },
  { key: "organizations", icon: Building2 },
  { key: "plans", icon: CreditCard },
  { key: "health", icon: Activity },
  { key: "audit", icon: ScrollText },
]

function SidebarContent({
  section,
  onSelect,
  compact = false,
}: {
  section: SectionKey
  onSelect: (key: SectionKey) => void
  compact?: boolean
}) {
  const { t } = useI18n()
  const user = useSessionStore((s) => s.user)
  const logout = useSessionStore((s) => s.logout)

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn("flex items-center gap-2.5", compact ? "px-4" : "px-5", "h-14 shrink-0 border-b border-sidebar-border")}>
        <PeopleFlowLogo markClassName="h-7 w-7" className="text-[15px]" />
        <Badge className="gap-1 bg-sidebar-accent text-sidebar-accent-foreground">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          {t("admin.nav.superAdmin")}
        </Badge>
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto py-3 pf-scrollbar", compact ? "px-3" : "px-3")} aria-label={t("admin.nav.sectionTitle")}>
        {NAV_ITEMS.map((item) => {
          const active = section === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
              <span className="truncate">{t(`admin.nav.${item.key}`)}</span>
            </button>
          )
        })}
      </nav>

      {/* User card */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {initialsOf(user?.name ?? "?")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => void logout()}
            aria-label={t("common.logout")}
            title={t("common.logout")}
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminShell() {
  const { t } = useI18n()
  const user = useSessionStore((s) => s.user)
  const logout = useSessionStore((s) => s.logout)
  const [section, setSection] = useState<SectionKey>("overview")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [detailOrgId, setDetailOrgId] = useState<string | null>(null)

  const openDetail = (orgId: string) => setDetailOrgId(orgId)

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <SidebarContent section={section} onSelect={setSection} />
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
            {/* Mobile nav */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 lg:hidden"
                  aria-label={t("admin.nav.menu")}
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-0 [&>button]:hidden">
                <SheetTitle className="sr-only">{t("admin.nav.menu")}</SheetTitle>
                <SheetDescription className="sr-only">{t("admin.nav.sectionTitle")}</SheetDescription>
                <SidebarContent
                  section={section}
                  onSelect={(key) => {
                    setSection(key)
                    setMobileNavOpen(false)
                  }}
                />
              </SheetContent>
            </Sheet>

            <h2 className="truncate text-sm font-semibold sm:text-base">{t(`admin.nav.${section}`)}</h2>

            <div className="ml-auto flex items-center gap-2">
              <LangToggle />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-shadow hover:shadow-xs"
                    aria-label={t("common.settings")}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                        {initialsOf(user?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="min-w-0">
                    <p className="truncate text-sm font-medium">{user?.name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => void logout()}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    {t("common.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Section content */}
          <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {section === "overview" && <OverviewView onOpenOrg={openDetail} />}
                {section === "organizations" && <OrgsView onOpenDetail={openDetail} />}
                {section === "plans" && <PlansView />}
                {section === "health" && <HealthView />}
                {section === "audit" && <AuditView />}
              </motion.div>
            </AnimatePresence>
          </main>

          <AppFooter />
        </div>
      </div>

      {/* Org detail dialog lives at shell level so provisioning polls survive section switches */}
      {detailOrgId && (
        <OrgDetailDialog orgId={detailOrgId} onClose={() => setDetailOrgId(null)} />
      )}
    </div>
  )
}
