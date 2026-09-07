"use client"

// Shared badges for the admin panel (status / plan / audit action)
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { planFor } from "@/lib/features"
import { useI18n } from "@/lib/i18n"

export function OrgStatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useI18n()
  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1.5 border-success/30 bg-success/10 text-success", className)}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
        {t("admin.orgs.active")}
      </Badge>
    )
  }
  if (status === "suspended") {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1.5 border-destructive/30 bg-destructive/10 text-destructive", className)}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden />
        {t("admin.orgs.suspended")}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border-warning/40 bg-warning/15 text-warning", className)}
    >
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      {t("admin.orgs.provisioning")}
    </Badge>
  )
}

export function PlanBadge({ planKey, className }: { planKey: string; className?: string }) {
  const { lang } = useI18n()
  const plan = planFor(planKey)
  return (
    <Badge variant="outline" className={cn("border-primary/30 bg-primary/10 text-primary", className)}>
      {lang === "bn" ? plan.nameBn : plan.nameEn}
    </Badge>
  )
}

const ACTION_STYLES: Record<string, string> = {
  "org.created": "border-primary/30 bg-primary/10 text-primary",
  "org.provisioned": "border-success/30 bg-success/10 text-success",
  "org.activated": "border-success/30 bg-success/10 text-success",
  "org.suspended": "border-warning/40 bg-warning/15 text-warning",
  "org.deleted": "border-destructive/30 bg-destructive/10 text-destructive",
  "org.impersonated": "border-primary/30 bg-primary/10 text-primary",
  "plan.changed": "border-primary/30 bg-primary/10 text-primary",
  "feature.enabled": "border-success/30 bg-success/10 text-success",
  "feature.disabled": "border-warning/40 bg-warning/15 text-warning",
  "auth.login": "border-border bg-muted text-muted-foreground",
  "auth.logout": "border-border bg-muted text-muted-foreground",
}

export function ActionBadge({ action, label }: { action: string; label: string }) {
  return (
    <Badge variant="outline" className={cn("max-w-full", ACTION_STYLES[action] ?? "border-border bg-muted text-muted-foreground")}>
      <span className="truncate font-mono text-[11px]">{label}</span>
    </Badge>
  )
}
