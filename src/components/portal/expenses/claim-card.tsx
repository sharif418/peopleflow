"use client"

// Claim card — employee identity, title, category badge, big ৳ amount,
// status badge, expense date + item count, reviewer note, and contextual
// actions (review / quick approve / reject / delete) shared by both tabs.
import { BadgeCheck, CalendarDays, Clock, MessageSquareText, Trash2, XCircle } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt, formatNumber, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { ClaimRow } from "./types"
import {
  categoryLabel,
  categoryMeta,
  claimStatusBadgeClass,
  claimStatusLabel,
  formatExpenseDate,
  relativeExpenseTime,
} from "./utils"

export function ClaimCard({
  claim,
  busy = false,
  onReview,
  onQuickApprove,
  onReject,
  onDelete,
}: {
  claim: ClaimRow
  busy?: boolean
  onReview: () => void
  onQuickApprove?: () => void
  onReject?: () => void
  onDelete?: () => void
}) {
  const { lang, t } = useI18n()
  const name = `${claim.employee.firstName} ${claim.employee.lastName}`
  const isSubmitted = claim.status === "submitted"
  const cat = categoryMeta(claim.category)
  const CatIcon = cat.icon

  return (
    <Card
      className={cn(
        "pf-card-hover border-border/80 bg-card shadow-xs",
        isSubmitted && "border-warning/30",
      )}
    >
      <CardContent className="space-y-3 p-4 sm:p-5">
        {/* Identity + status */}
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
                <span className="font-mono font-semibold text-primary">{claim.employee.employeeCode}</span>
                {claim.employee.designation && ` · ${claim.employee.designation.name}`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("shrink-0 whitespace-nowrap", claimStatusBadgeClass(claim.status))}>
            {claimStatusLabel(claim.status, t)}
          </Badge>
        </div>

        {/* Title + category + item count */}
        <div className="space-y-2">
          <p className="text-sm font-semibold leading-snug sm:text-base">{claim.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("gap-1.5 whitespace-nowrap font-medium", cat.badge)}>
              <CatIcon className="size-3.5" aria-hidden />
              {categoryLabel(claim.category, t)}
            </Badge>
            <Badge variant="secondary" className="tabular-nums">
              {t("portal.expense.claims.itemsCount", { n: formatNumber(claim._count.items, lang) })}
            </Badge>
          </div>
        </div>

        {/* Big amount */}
        <p className="pf-money text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {formatBdt(claim.totalAmount, lang)}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            <span className="tabular-nums">
              {t("portal.expense.claims.expenseDate")}: {formatExpenseDate(claim.expenseDate, lang)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            {relativeExpenseTime(claim.createdAt, lang, t)}
          </span>
        </div>

        {/* Reviewer note */}
        {claim.reviewerNote && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <MessageSquareText className="mr-1 inline size-3.5" aria-hidden />
            <span className="font-medium text-foreground">{t("portal.expense.claims.note")}: </span>
            {claim.reviewerNote}
          </p>
        )}

        {/* Actions — pending inbox: quick approve / reject / review */}
        {onQuickApprove && isSubmitted && (
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button className="h-10 sm:min-w-36" disabled={busy} onClick={onQuickApprove}>
              <BadgeCheck className="size-4" aria-hidden />
              {t("portal.expense.pending.quickApprove")}
            </Button>
            <Button
              variant="outline"
              className="h-10 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-w-28"
              disabled={busy}
              onClick={onReject}
            >
              <XCircle className="size-4" aria-hidden />
              {t("portal.expense.actions.reject")}
            </Button>
            <Button variant="ghost" className="h-10 text-muted-foreground hover:text-foreground" disabled={busy} onClick={onReview}>
              {t("portal.expense.actions.review")}
            </Button>
          </div>
        )}

        {/* Actions — all-claims tab: review + delete (submitted only) */}
        {!onQuickApprove && (
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-10 sm:min-w-28" disabled={busy} onClick={onReview}>
              {t("portal.expense.actions.review")}
            </Button>
            {isSubmitted && onDelete && (
              <Button
                variant="ghost"
                className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={busy}
                onClick={onDelete}
              >
                <Trash2 className="size-4" aria-hidden />
                {t("portal.expense.actions.delete")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
