"use client"

// Organization portal sidebar — Link-based navigation (extracted from PortalShell)
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, Clock, LayoutDashboard, LayoutGrid, LogOut, MapPin, Menu, Network, Settings, Users, X } from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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
import { FEATURES, FEATURE_MAP, planFor, type FeatureDef } from "@/lib/features"
import { initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { portalPath, portalSectionPath } from "@/lib/nav"
import { useLogout } from "@/hooks/use-logout"
import type { PortalSection } from "./types"

interface NavItem {
  key: PortalSection
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  label: string
}

function LogoutItem() {
  const logout = useLogout()
  const { t } = useI18n()
  return (
    <DropdownMenuItem variant="destructive" onClick={() => void logout()} className="min-h-10 cursor-pointer">
      <LogOut className="size-4" aria-hidden />
      {t("portal.shell.logout")}
    </DropdownMenuItem>
  )
}

function UserMenu() {
  const { user, org } = useSessionStore()
  const { t } = useI18n()
  if (!user) return null
  const plan = org ? planFor(org.planKey) : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-1.5 py-1 shadow-xs transition-colors hover:bg-accent/60"
          aria-label={`${t("portal.shell.loggedInAs")} ${user.email}`}
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {initialsOf(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{user.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="min-h-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {plan && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {t("portal.shell.planBadge")}:{" "}
            <span className="font-medium text-foreground">{plan.nameBn}</span>
          </div>
        )}
        <DropdownMenuSeparator />
        <LogoutItem />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PortalSidebarContent({ onSheetClose }: { onSheetClose?: () => void }) {
  const { user, org } = useSessionStore()
  const logout = useLogout()
  const { t } = useI18n()
  const pathname = usePathname()
  const plan = org ? planFor(org.planKey) : null
  const flags = org?.featureFlags ?? {}
  const orgKey = org?.subdomain || org?.id || ""

  // current portal section derived from the URL
  const rest = pathname.replace(/^\/portal\/[^/]+\/?/, "")
  const currentSegment = rest.split("/")[0] ?? ""
  const currentSection: PortalSection = currentSegment
    ? currentSegment === "modules"
      ? "modules"
      : FEATURE_MAP[currentSegment]
        ? (`feature:${currentSegment}` as PortalSection)
        : (currentSegment as PortalSection)
    : "dashboard"

  const isActive = (key: PortalSection) => {
    if (key === currentSection) return true
    const seg = portalSectionPath(key)
    return seg !== "" && seg === currentSegment
  }

  const coreItems: NavItem[] = [
    { key: "dashboard", icon: LayoutDashboard, label: t("portal.shell.dashboard") },
    { key: "employees", icon: Users, label: t("portal.shell.employees") },
    { key: "departments", icon: Network, label: t("portal.shell.departments") },
    { key: "designations", icon: Briefcase, label: t("portal.shell.designations") },
    { key: "branches", icon: MapPin, label: t("portal.shell.branches") },
    { key: "shifts", icon: Clock, label: t("portal.shell.shifts") },
    { key: "settings", icon: Settings, label: t("portal.shell.settings") },
  ]

  const otherFeatures = FEATURES.filter((f) => f.key !== "hr_core" && flags[f.key])

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        <PeopleFlowLogo markClassName="h-7 w-7" className="text-base" />
        {onSheetClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full lg:hidden"
            onClick={onSheetClose}
            aria-label={t("common.close")}
          >
            <X className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      {org && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{org.name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {plan && (
              <Badge variant="secondary" className="bg-primary/15 text-primary hover:bg-primary/15">
                {plan.nameBn}
              </Badge>
            )}
            <span className="truncate text-xs text-muted-foreground">
              {org.subdomain}.peopleflow.com
            </span>
          </div>
          {org.status === "suspended" && (
            <p className="mt-1.5 text-xs font-medium text-destructive">
              {t("portal.shell.statusSuspended")}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-3 pf-scrollbar">
        <nav aria-label={t("portal.shell.menu")} className="flex flex-col gap-1 px-3">
          {coreItems.map((item) => (
            <Link
              key={item.key}
              href={portalPath(orgKey, item.key)}
              onClick={onSheetClose}
              aria-current={isActive(item.key) ? "page" : undefined}
              className={cn(
                "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                isActive(item.key)
                  ? "bg-primary/12 text-primary"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4.5 shrink-0" aria-hidden />
              <span className="truncate text-left">{item.label}</span>
            </Link>
          ))}

          {otherFeatures.length > 0 && (
            <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("portal.modules.enabled")}
            </p>
          )}
          {otherFeatures.map((f: FeatureDef) => (
            <Link
              key={f.key}
              href={portalPath(orgKey, `feature:${f.key}`)}
              onClick={onSheetClose}
              aria-current={isActive(`feature:${f.key}`) ? "page" : undefined}
              className={cn(
                "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                isActive(`feature:${f.key}`)
                  ? "bg-primary/12 text-primary"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <f.icon className="size-4.5 shrink-0" aria-hidden />
              <span className="truncate text-left">{f.nameBn}</span>
            </Link>
          ))}

          <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("portal.shell.modules")}
          </p>
          <Link
            href={portalPath(orgKey, "modules")}
            onClick={onSheetClose}
            aria-current={isActive("modules") ? "page" : undefined}
            className={cn(
              "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              isActive("modules")
                ? "bg-primary/12 text-primary"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <LayoutGrid className="size-4.5 shrink-0" aria-hidden />
            <span className="truncate text-left">{t("portal.shell.modules")}</span>
          </Link>
        </nav>
      </div>

      {user && (
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 p-2">
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {initialsOf(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={() => void logout()}
              aria-label={t("portal.shell.logout")}
              title={t("portal.shell.logout")}
            >
              <LogOut className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Topbar with mobile sheet — derives the page title from the current route. */
export function PortalTopbar() {
  const { t } = useI18n()
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const rest = pathname.replace(/^\/portal\/[^/]+\/?/, "")
  const currentSegment = rest.split("/")[0] ?? ""

  let title = t("common.appName")
  if (currentSegment === "modules") title = t("portal.shell.modules")
  else if (currentSegment === "employees") title = t("portal.shell.employees")
  else if (currentSegment === "departments") title = t("portal.shell.departments")
  else if (currentSegment === "designations") title = t("portal.shell.designations")
  else if (currentSegment === "branches") title = t("portal.shell.branches")
  else if (currentSegment === "shifts") title = t("portal.shell.shifts")
  else if (currentSegment === "settings") title = t("portal.shell.settings")
  else if (currentSegment && FEATURE_MAP[currentSegment]) {
    title = FEATURE_MAP[currentSegment].nameBn
  } else if (!currentSegment) {
    title = t("portal.shell.dashboard")
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-4">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full lg:hidden"
            aria-label={t("portal.shell.menu")}
          >
            <Menu className="size-4.5" aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">{t("portal.shell.menu")}</SheetTitle>
          <PortalSidebarContent onSheetClose={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <h2 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h2>

      <div className="flex shrink-0 items-center gap-2">
        <LangToggle />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
