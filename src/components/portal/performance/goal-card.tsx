"use client"

// Goal card — employee identity, progress bar, target/current with unit,
// due date + overdue badge, weight dots, progress / lifecycle actions.
import { CalendarClock, CheckCircle2, MoreHorizontal, PenLine, Trash2, XCircle } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatNumber, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { GoalRow } from "./types"
import {
  dueText,
  dueTextClass,
  formatGoalDate,
  formatGoalValue,
  goalStatusBadgeClass,
  goalStatusLabel,
  progressColorClass,
} from "./utils"

export function GoalCard({
  goal,
  busy,
  onUpdateProgress,
  onComplete,
  onCancel,
  onDelete,
}: {
  goal: GoalRow
  busy: boolean
  onUpdateProgress: () => void
  onComplete: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  const { lang, t } = useI18n()
  const name = `${goal.employee.firstName} ${goal.employee.lastName}`
  const isActive = goal.status === "active"

  return (
    <Card
      className={cn(
        "pf-card-hover border-border/80 bg-card shadow-xs",
        goal.isOverdue && "border-destructive/30",
      )}
    >
      <CardContent className="space-y-3 p-4 sm:p-5">
        {/* Identity row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
                {initialsOf(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-primary">{goal.employee.employeeCode}</span>
                {goal.employee.designation && ` · ${goal.employee.designation.name}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {goal.isDueSoon && !goal.isOverdue && (
              <Badge variant="outline" className="whitespace-nowrap border-warning/40 bg-warning/15 text-warning-foreground">
                {t("portal.performance.goalStatus.dueSoon")}
              </Badge>
            )}
            <Badge variant="outline" className={cn("whitespace-nowrap", goalStatusBadgeClass(goal.status, goal.isOverdue))}>
              {goalStatusLabel(goal.status, goal.isOverdue, t)}
            </Badge>
          </div>
        </div>

        {/* Title + description */}
        <div>
          <p className="text-sm font-semibold leading-snug">{goal.title}</p>
          {goal.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{goal.description}</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("portal.performance.goals.progress")}</span>
            <span className="font-semibold tabular-nums">
              {formatNumber(goal.progressPercent, lang)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={goal.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("portal.performance.goals.progress")}
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn("h-full rounded-full transition-all", progressColorClass(goal.progressPercent))}
              style={{ width: `${goal.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Values + due + weight */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="tabular-nums">
            <span className="text-muted-foreground">{t("portal.performance.goals.current")}: </span>
            <span className="font-semibold">{formatGoalValue(goal.currentValue, goal.unit, lang)}</span>
            <span className="text-muted-foreground">
              {t("portal.performance.goals.ofTarget", { target: formatGoalValue(goal.targetValue, goal.unit, lang) })}
            </span>
          </span>
          <span className={cn("inline-flex items-center gap-1.5", dueTextClass(goal.daysRemaining, goal.isOverdue))}>
            <CalendarClock className="size-3.5 shrink-0" aria-hidden />
            <span className="tabular-nums">
              {formatGoalDate(goal.dueDate, lang)} · {dueText(goal.daysRemaining, lang, t)}
            </span>
          </span>
          <span
            className="inline-flex items-center gap-1"
            title={t("portal.performance.goals.weightLabel", { n: formatNumber(goal.weight, lang) })}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn("size-1.5 rounded-full", i < goal.weight ? "bg-primary" : "bg-muted")}
                aria-hidden
              />
            ))}
          </span>
        </div>

        {/* Actions */}
        {isActive && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button className="h-10 flex-1 sm:flex-none sm:min-w-40" disabled={busy} onClick={onUpdateProgress}>
              <PenLine className="size-4" aria-hidden />
              {t("portal.performance.goalActions.updateProgress")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-10" disabled={busy} aria-label={t("portal.performance.goalActions.updateProgress")}>
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onComplete} className="min-h-10">
                  <CheckCircle2 className="size-4 text-success" aria-hidden />
                  {t("portal.performance.goalActions.complete")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCancel} className="min-h-10">
                  <XCircle className="size-4 text-warning-foreground" aria-hidden />
                  {t("portal.performance.goalActions.cancel")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="min-h-10 text-destructive focus:text-destructive">
                  <Trash2 className="size-4" aria-hidden />
                  {t("portal.performance.goalActions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
