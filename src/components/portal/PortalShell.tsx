"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Briefcase, Clock, LayoutDashboard, LayoutGrid, LogOut, MapPin, Menu, Network, Users, X } from "lucide-react"
import { useSessionStore } from "@/store/session"
import { useI18n } from "@/lib/i18n"
import { FEATURES, FEATURE_MAP, planFor, type FeatureDef } from "@/lib/features"
import { initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LangToggle } from "@/components/shared/lang-toggle"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { AppFooter } from "@/components/shared/app-footer"
import { PeopleFlowLogo } from "@/components/shared/peopleflow-logo"
import { EmptyState } from "@/components/shared/empty-state"
import type { PortalSection } from "./types"
import { DashboardView } from "./dashboard-view"
import { EmployeesView } from "./employees-view"
import { HrCrudView } from "./hr-crud-view"
import { ModulesView } from "./modules-view"
import { ModulePlaceholderView } from "./module-placeholder-view"
import { SetupWizard } from "./setup-wizard"

const CORE_ICONS = { LayoutDashboard, Users, Network, Briefcase, MapPin, Clock } as const

interface NavItem {
  key: PortalSection
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  label: string
}

function LogoutItem() {
  const logout = useSessionStore((s) => s.logout)
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

function NavButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: NavItem["icon"]
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden />
      <span className="truncate text-left">{label}</span>
    </button>
  )
}

function SidebarNav({ section, onNavigate }: { section: PortalSection; onNavigate: (s: PortalSection) => void }) {
  const { org } = useSessionStore()
  const { t } = useI18n()
  const flags = org?.featureFlags ?? {}

  const coreItems: NavItem[] = useMemo(
    () => [
      { key: "dashboard", icon: LayoutDashboard, label: t("portal.shell.dashboard") },
      { key: "employees", icon: Users, label: t("portal.shell.employees") },
      { key: "departments", icon: Network, label: t("portal.shell.departments") },
      { key: "designations", icon: Briefcase, label: t("portal.shell.designations") },
      { key: "branches", icon: MapPin, label: t("portal.shell.branches") },
      { key: "shifts", icon: Clock, label: t("portal.shell.shifts") },
    ],
    [t],
  )

  const otherFeatures = useMemo<FeatureDef[]>(
    () => FEATURES.filter((f) => f.key !== "hr_core" && flags[f.key]),
    [flags],
  )

  return (
    <nav aria-label={t("portal.shell.menu")} className="flex flex-col gap-1 px-3">
      {coreItems.map((item) => (
        <NavButton
          key={item.key}
          active={section === item.key}
          icon={item.icon}
          label={item.label}
          onClick={() => onNavigate(item.key)}
        />
      ))}

      {otherFeatures.length > 0 && (
        <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("portal.modules.enabled")}
        </p>
      )}
      {otherFeatures.map((f) => (
        <NavButton
          key={f.key}
          active={section === `feature:${f.key}`}
          icon={f.icon}
          label={f.nameBn}
          onClick={() => onNavigate(`feature:${f.key}`)}
        />
      ))}

      <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("portal.shell.modules")}
      </p>
      <NavButton
        active={section === "modules"}
        icon={LayoutGrid}
        label={t("portal.shell.modules")}
        onClick={() => onNavigate("modules")}
      />
    </nav>
  )
}

function SidebarContent({
  section,
  onNavigate,
  onSheetClose,
}: {
  section: PortalSection
  onNavigate: (s: PortalSection) => void
  onSheetClose?: () => void
}) {
  const { user, org, logout } = useSessionStore()
  const { t } = useI18n()
  const plan = org ? planFor(org.planKey) : null

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
        <SidebarNav section={section} onNavigate={onNavigate} />
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

function SectionTitle({ section }: { section: PortalSection }) {
  const { t } = useI18n()
  const featureKey = section.startsWith("feature:") ? section.slice("feature:".length) : null
  let title = t("common.appName")
  if (featureKey) {
    title = FEATURE_MAP[featureKey]?.nameBn ?? featureKey
  } else if (section === "modules") {
    title = t("portal.shell.modules")
  } else if (section === "employees") {
    title = t("portal.shell.employees")
  } else if (section === "departments") {
    title = t("portal.shell.departments")
  } else if (section === "designations") {
    title = t("portal.shell.designations")
  } else if (section === "branches") {
    title = t("portal.shell.branches")
  } else if (section === "shifts") {
    title = t("portal.shell.shifts")
  }
  return <>{title}</>
}

export default function PortalShell() {
  const { user, org } = useSessionStore()
  const { t } = useI18n()
  const [section, setSection] = useState<PortalSection>("dashboard")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [wizardDismissed, setWizardDismissed] = useState(false)
  const [wizardKeep, setWizardKeep] = useState(false)

  const navigate = (s: PortalSection) => {
    setSection(s)
    setMobileNavOpen(false)
  }

  if (!org || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <EmptyState title={t("common.error")} description={t("portal.common.errorDesc")} />
      </div>
    )
  }

  // The wizard stays mounted after completion (success screen) until the user
  // explicitly goes to the dashboard or skips — `wizardKeep` guards against the
  // session refresh flipping `setupCompleted` and unmounting it mid-celebration.
  const showWizard = !wizardDismissed && (wizardKeep || !org.setupCompleted)
  const featureKey = section.startsWith("feature:") ? section.slice("feature:".length) : null

  const renderSection = () => {
    if (featureKey) {
      if (FEATURE_MAP[featureKey]) return <ModulePlaceholderView featureKey={featureKey} />
      return <EmptyState title={t("common.error")} />
    }
    switch (section) {
      case "employees":
        return <EmployeesView />
      case "departments":
      case "designations":
      case "branches":
      case "shifts":
        return <HrCrudView resource={section} />
      case "modules":
        return <ModulesView onNavigate={navigate} />
      default:
        return <DashboardView onNavigate={navigate} />
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <SidebarContent section={section} onNavigate={navigate} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
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
                <SidebarContent
                  section={section}
                  onNavigate={navigate}
                  onSheetClose={() => setMobileNavOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <h2 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-lg">
              <SectionTitle section={section} />
            </h2>

            <div className="flex shrink-0 items-center gap-2">
              <LangToggle />
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>

          <main id="main-content" className="flex-1">
            {showWizard ? (
              <SetupWizard
                onSkip={() => setWizardDismissed(true)}
                onCompleted={() => setWizardKeep(true)}
                onDone={() => setWizardDismissed(true)}
              />
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={featureKey ?? section}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="mx-auto w-full max-w-6xl p-4 sm:p-6"
                >
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}
