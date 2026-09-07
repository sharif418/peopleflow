"use client"

// Read-only org info card — plan badge, employee count, setup status,
// created date and domain row.
import { motion } from "framer-motion"
import { CheckCircle2, Circle, Globe, Info } from "lucide-react"
import { formatDate, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrgSettingsData } from "../payroll/types"

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-sm font-medium">{value}</span>
    </div>
  )
}

export function InfoCard({
  data,
  planName,
  lang,
  t,
}: {
  data: OrgSettingsData
  planName: string
  lang: "bn" | "en"
  t: (k: string) => string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.15 }}
      className="lg:col-span-2"
    >
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4 text-primary" aria-hidden />
            {t("portal.settings.infoTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div className="divide-y divide-border/50">
              <InfoRow
                label={t("portal.settings.infoPlan")}
                value={<Badge className="border-primary/30 bg-primary/12 text-primary">{planName}</Badge>}
              />
              <InfoRow
                label={t("portal.settings.infoEmployees")}
                value={`${formatNumber(data.employeeCount, lang)} ${t("portal.common.person")}`}
              />
            </div>
            <div className="divide-y divide-border/50">
              <InfoRow
                label={t("portal.settings.infoSetup")}
                value={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-medium",
                      data.setupCompleted ? "text-success" : "text-warning",
                    )}
                  >
                    {data.setupCompleted ? (
                      <CheckCircle2 className="size-3.5" aria-hidden />
                    ) : (
                      <Circle className="size-3.5" aria-hidden />
                    )}
                    {data.setupCompleted
                      ? t("portal.settings.infoSetupDone")
                      : t("portal.settings.infoSetupPending")}
                  </span>
                }
              />
              <InfoRow label={t("portal.settings.infoCreated")} value={formatDate(data.createdAt, lang)} />
              <InfoRow
                label={t("portal.settings.infoDomain")}
                value={
                  <span className="inline-flex items-center gap-1 font-mono text-sm">
                    <Globe className="size-3.5 text-muted-foreground" aria-hidden />
                    {data.subdomain}.peopleflow.com
                  </span>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
