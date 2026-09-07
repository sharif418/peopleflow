"use client"

// Rich leave request card — employee identity, type badge, Bengali date range,
// warnings (overlap / balance) and review actions for pending requests.
import { BadgeCheck, CalendarRange, Clock, MessageSquareText, X, XCircle } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatNumber, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { LeaveRequestRow } from "./types"
import {
  formatLeaveRange,
  leaveStatusBadgeClass,
  leaveStatusLabel,
  relativeLeaveTime,
  type LeaveHue,
} from "./utils"

export function RequestCard({
  request,
  hue,
  busy,
  onApprove,
  onReject,
  onCancel,
}: {
  request: LeaveRequestRow
  hue: LeaveHue | null
  busy: boolean
  onApprove: () => void
  onReject: () => void
  onCancel: () => void
}) {
  const { lang, t } = useI18n()
  const name = `${request.employee.firstName} ${request.employee.lastName}`
  const isPending = request.status === "pending"

  return (
    <Card
      className={cn(
        "pf-card-hover border-border/80 bg-card shadow-xs",
        isPending && "border-warning/30",
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
                <span className="font-mono font-semibold text-primary">{request.employee.employeeCode}</span>
                {request.employee.designation && ` · ${request.employee.designation.name}`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("shrink-0 whitespace-nowrap", leaveStatusBadgeClass(request.status))}>
            {leaveStatusLabel(request.status, t)}
          </Badge>
        </div>

        {/* Leave details */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge variant="outline" className={cn("whitespace-nowrap font-medium", hue?.badge)}>
            {request.leaveType.name}
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarRange className="size-4 shrink-0" aria-hidden />
            <span className="tabular-nums">{formatLeaveRange(request.fromDate, request.toDate, lang)}</span>
          </span>
          <Badge variant="secondary" className="tabular-nums">
            {t("portal.leave.requests.daysUnit", { n: formatNumber(request.days, lang) })}
          </Badge>
        </div>

        {/* Reason */}
        {request.reason ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("portal.leave.requests.reason")}: </span>
            {request.reason}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground">{t("portal.leave.requests.noReason")}</p>
        )}

        {/* Warnings (decision helpers) */}
        {(request.overlapsExisting || request.exceedsBalance) && (
          <div className="flex flex-wrap gap-2">
            {request.overlapsExisting && (
              <Badge variant="outline" className="border-warning/40 bg-warning/15 text-warning-foreground">
                {t("portal.leave.requests.overlapWarn")}
              </Badge>
            )}
            {request.exceedsBalance && (
              <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
                {t("portal.leave.requests.balanceWarn")}
              </Badge>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {relativeLeaveTime(request.createdAt, lang, t)}
          </span>
          {isPending && (
            <span className="tabular-nums">
              {t("portal.leave.requests.balanceAvailable", { n: formatNumber(request.balanceAvailable, lang) })}
            </span>
          )}
        </div>

        {/* Reviewer note */}
        {request.reviewerNote && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <MessageSquareText className="mr-1 inline size-3.5" aria-hidden />
            <span className="font-medium text-foreground">{t("portal.leave.requests.note")}: </span>
            {request.reviewerNote}
          </p>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              className="h-10 sm:min-w-32"
              disabled={busy}
              onClick={onApprove}
            >
              <BadgeCheck className="size-4" aria-hidden />
              {t("portal.leave.actions.approve")}
            </Button>
            <Button
              variant="outline"
              className="h-10 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-w-32"
              disabled={busy}
              onClick={onReject}
            >
              <XCircle className="size-4" aria-hidden />
              {t("portal.leave.actions.reject")}
            </Button>
            <Button
              variant="ghost"
              className="h-10 text-muted-foreground hover:text-foreground"
              disabled={busy}
              onClick={onCancel}
            >
              <X className="size-4" aria-hidden />
              {t("portal.leave.actions.cancel")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
