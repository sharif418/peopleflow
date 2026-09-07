"use client"

// Super Admin sidebar — Link-based navigation (extracted from the old AdminShell)
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, CreditCard, Activity, LayoutDashboard, LogOut, Menu, ScrollText, ShieldCheck } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PeopleFlowLogo } from "@/components/shared/peopleflow-logo"
import { LangToggle } from "@/components/shared/lang-toggle"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { useSessionStore } from "@/store/session"
import { useI18n } from "@/lib/i18n"
import { initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ADMIN_SECTIONS, adminPath, type AdminSection } from "@/lib/nav"
import { useLogout } from "@/hooks/use-logout"

const SECTION_ICONS: Record<AdminSection, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  organizations: Building2,
  plans: CreditCard,
  health: Activity,
  audit: ScrollText,
}

function UserMenu() {
  const { t } = useI18n()
  const user = useSessionStore((s) => s.user)
  const logout = useLogout()

  return (
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
        <DropdownMenuItem variant="destructive" onClick={() => void logout()} className="gap-2">
          <LogOut className="h-4 w-4" aria-hidden />
          {t("common.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const user = useSessionStore((s) => s.user)
  const logout = useLogout()

  // active section: longest matching admin path ("" for overview)
  const active = ADMIN_SECTIONS.reduce<AdminSection | null>((best, s) => {
    const p = adminPath(s)
    if (pathname === p || (p !== "/admin" && pathname.startsWith(p + "/"))) return s
    if (s === "overview" && pathname === "/admin") return s
    return best
  }, null)

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5">
        <PeopleFlowLogo markClassName="h-7 w-7" className="text-[15px]" />
        <Badge className="gap-1 bg-sidebar-accent text-sidebar-accent-foreground">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          {t("admin.nav.superAdmin")}
        </Badge>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto py-3 pf-scrollbar px-3" aria-label={t("admin.nav.sectionTitle")}>
        {ADMIN_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section]
          const isActive = active === section
          return (
            <Link
              key={section}
              href={adminPath(section)}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
              <span className="truncate">{t(`admin.nav.${section}`)}</span>
            </Link>
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

/** Topbar + mobile nav sheet — shared across all /admin pages. */
export function AdminTopbar() {
  const { t } = useI18n()
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const section = ADMIN_SECTIONS.find((s) => {
    const p = adminPath(s)
    return pathname === p || (p !== "/admin" && pathname.startsWith(p + "/"))
  })
  const title = t(`admin.nav.${section ?? "overview"}`)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" aria-label={t("admin.nav.menu")}>
            <Menu className="h-5 w-5" aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 [&>button]:hidden">
          <SheetTitle className="sr-only">{t("admin.nav.menu")}</SheetTitle>
          <SheetDescription className="sr-only">{t("admin.nav.sectionTitle")}</SheetDescription>
          <AdminSidebarContent onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <h2 className="truncate text-sm font-semibold sm:text-base">{title}</h2>

      <div className="ml-auto flex items-center gap-2">
        <LangToggle />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
