"use client"

import { motion } from "framer-motion"
import { CalendarClock, Zap } from "lucide-react"
import { useSessionStore } from "@/store/session"
import { useI18n } from "@/lib/i18n"
import { FEATURE_MAP } from "@/lib/features"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"

export function ModulePlaceholderView({ featureKey }: { featureKey: string }) {
  const { org } = useSessionStore()
  const { lang, t } = useI18n()
  const feature = FEATURE_MAP[featureKey]
  if (!feature) return null

  const name = lang === "bn" ? feature.nameBn : feature.nameEn
  const desc = lang === "bn" ? feature.descBn : feature.descEn
  const Icon = feature.icon

  return (
    <div className="space-y-6">
      <PageHeader title={name} subtitle={desc} icon={Icon} />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="border-primary/25 bg-gradient-to-b from-primary/8 to-transparent">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-10">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex size-16 items-center justify-center rounded-2xl bg-primary/12 text-primary"
            >
              <Icon className="size-8" aria-hidden />
            </motion.div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant="secondary" className="border-success/30 bg-success/15 text-success">
                <Zap className="size-3" aria-hidden />
                {t("portal.modules.enabled")}
              </Badge>
              {org && (
                <Badge variant="outline" className="font-normal">
                  {t("portal.shell.organization")}: {org.name}
                </Badge>
              )}
            </div>

            <p className="max-w-md text-base font-semibold leading-relaxed">
              {t("portal.modules.phase2")}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">{t("portal.modules.phase2Desc")}</p>

            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="size-4" aria-hidden />
              {t("common.comingSoon")}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
