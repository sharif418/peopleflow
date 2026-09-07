"use client"

// /portal/[orgId]/[feature] — feature module route.
// Renders the real module for built-in features, a locked view when the
// feature flag is off, and 404s for unknown feature keys.
import { useParams, notFound } from "next/navigation"
import Link from "next/link"
import { Lock, LayoutGrid, CalendarClock, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { useSessionStore } from "@/store/session"
import { useI18n } from "@/lib/i18n"
import { FEATURE_MAP } from "@/lib/features"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import AttendanceModule from "@/components/portal/attendance/AttendanceModule"
import LeaveModule from "@/components/portal/leave/LeaveModule"
import PayrollModule from "@/components/portal/payroll/PayrollModule"
import { ModulePlaceholderView } from "@/components/portal/module-placeholder-view"

/** Real, implemented module components keyed by feature key. */
const MODULES: Record<string, React.ComponentType> = {
  attendance: AttendanceModule,
  leave: LeaveModule,
  payroll: PayrollModule,
}

function FeatureLockedView({ featureKey }: { featureKey: string }) {
  const { lang, t } = useI18n()
  const { org } = useSessionStore()
  const feature = FEATURE_MAP[featureKey]
  if (!feature) return null
  const name = lang === "bn" ? feature.nameBn : feature.nameEn
  const Icon = feature.icon

  return (
    <div className="space-y-6">
      <PageHeader title={name} subtitle={t("portal.feature.lockedDesc")} icon={Icon} />
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
        <Card className="border-border/80">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-10">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Lock className="size-8" aria-hidden />
            </div>
            <p className="max-w-md text-base font-semibold leading-relaxed">
              {t("portal.feature.lockedTitle")}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("portal.feature.lockedBody", { org: org?.name ?? "" })}
            </p>
            <Button asChild className="gap-2">
              <Link href="modules">
                <LayoutGrid className="size-4" aria-hidden />
                {t("portal.feature.goModules")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function FeatureModulePage() {
  const params = useParams<{ orgId: string; feature: string }>()
  const featureKey = params.feature
  const flags = useSessionStore((s) => s.org?.featureFlags ?? {})
  const { t } = useI18n()

  if (!FEATURE_MAP[featureKey]) notFound()

  const enabled = flags[featureKey] === true
  if (!enabled) return <FeatureLockedView featureKey={featureKey} />

  const Module = MODULES[featureKey]
  if (Module) return <Module />

  return (
    <div aria-live="polite">
      <span className="sr-only">{t("common.comingSoon")}</span>
      <ModulePlaceholderView featureKey={featureKey} />
    </div>
  )
}
