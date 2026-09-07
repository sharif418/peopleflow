"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
