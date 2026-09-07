"use client"

import type { LucideIcon } from "lucide-react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  iconClassName,
}: {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  iconClassName?: string
}) {
  return (
    <Card className="border-border/80 bg-card shadow-xs transition-shadow hover:shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
          {typeof trend === "number" && (
            <p
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 text-xs font-medium",
                trend >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span className="tabular-nums">
                {trend >= 0 ? "+" : ""}
                {trend}%
              </span>
              {trendLabel && <span className="font-normal text-muted-foreground">{trendLabel}</span>}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}
