"use client"

// Claim review dialog — full detail (employee info, line items table, total),
// decision note, and per-status actions: approve / reject (note required) /
// mark paid. Fetches the claim detail lazily when opened.
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, MessageSquareText } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatBdt, formatDate, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { EXPENSE_ENDPOINTS, expenseKeys, type ClaimAction, type ClaimDetail, type ClaimRow } from "./types"
import {
  categoryLabel,
  categoryMeta,
  claimStatusBadgeClass,
  claimStatusLabel,
  formatExpenseDate,
  relativeExpenseTime,
} from "./utils"

export function ClaimReviewDialog({
  open,
  onOpenChange,
  claim,
  busy,
  presetReject = false,
  onAction,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  claim: ClaimRow | null
  busy: boolean
  presetReject?: boolean
  onAction: (action: ClaimAction, note: string | null) => void
}) {
  const { lang, t } = useI18n()
  const [note, setNote] = useState("")

  const detailQuery = useQuery({
    queryKey: expenseKeys.detail(claim?.id ?? ""),
    queryFn: () => apiFetch<ClaimDetail>(EXPENSE_ENDPOINTS.claimItem(claim?.id ?? "")),
    enabled: open && !!claim,
    staleTime: 10_000,
  })
  const detail = detailQuery.data

  const close = (o: boolean) => {
    if (!busy) {
      if (!o) setNote("")
      onOpenChange(o)
    }
  }

  const canDecide = claim?.status === "submitted"
  const canPay = claim?.status === "approved"
  const showNoteField = canDecide || canPay
  const rejectDisabled = canDecide && note.trim() === ""

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{claim?.title ?? t("portal.expense.review.title")}</DialogTitle>
          <DialogDescription>{t("portal.expense.review.desc")}</DialogDescription>
        </DialogHeader>

        {claim && (
          <div className="space-y-4">
            {/* Claimant + claim meta */}
            <div className="space-y-3 rounded-lg bg-muted/50 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
                      {initialsOf(`${claim.employee.firstName} ${claim.employee.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {claim.employee.firstName} {claim.employee.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-mono font-semibold text-primary">{claim.employee.employeeCode}</span>
                      {claim.employee.designation && ` · ${claim.employee.designation.name}`}
                      {claim.employee.department && ` · ${claim.employee.department.name}`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("whitespace-nowrap", claimStatusBadgeClass(claim.status))}>
                  {claimStatusLabel(claim.status, t)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                <Badge variant="outline" className={cn("gap-1 font-medium", categoryMeta(claim.category).badge)}>
                  {categoryLabel(claim.category, t)}
                </Badge>
                <span className="tabular-nums">
                  {t("portal.expense.claims.expenseDate")}: {formatExpenseDate(claim.expenseDate, lang)}
                </span>
                <span>
                  {t("portal.expense.claims.submittedAgo")} {relativeExpenseTime(claim.createdAt, lang, t)}
                </span>
                {claim.reviewedAt && <span className="tabular-nums">{formatDate(claim.reviewedAt, lang)}</span>}
              </div>
              {claim.description && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{t("portal.expense.review.description")}: </span>
                  {claim.description}
                </p>
              )}
            </div>

            {/* Line items table */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">{t("portal.expense.review.itemsTitle")}</p>
              <div className="overflow-hidden rounded-lg border border-border/80">
                <div className="hidden grid-cols-[1fr_1fr_auto] gap-2 border-b border-border/80 bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
                  <span>{t("portal.expense.review.itemLabel")}</span>
                  <span>{t("portal.expense.review.itemNote")}</span>
                  <span className="text-right">{t("portal.expense.review.itemAmount")}</span>
                </div>
                {detailQuery.isPending ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8" />
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {detail?.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[1fr_1fr_auto] sm:gap-2"
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.note ?? "—"}</span>
                        <span className="pf-money font-semibold tabular-nums sm:text-right">
                          {formatBdt(item.amount, lang)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-muted/40 px-3 py-2.5">
                      <span className="text-sm font-semibold">{t("portal.expense.review.total")}</span>
                      <span className="pf-money text-base font-semibold tabular-nums text-primary sm:text-lg">
                        {formatBdt(detail?.totalAmount ?? claim.totalAmount, lang)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Existing reviewer note */}
            {claim.reviewerNote && (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <MessageSquareText className="mr-1 inline size-3.5" aria-hidden />
                <span className="font-medium text-foreground">{t("portal.expense.claims.note")}: </span>
                {claim.reviewerNote}
              </p>
            )}

            <Separator />

            {/* Decision note + actions */}
            {showNoteField && (
              <div className="space-y-2">
                <Label htmlFor="expense-review-note">{t("portal.expense.review.noteLabel")}</Label>
                <Textarea
                  id="expense-review-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("portal.expense.review.notePh")}
                  className="min-h-20"
                  maxLength={300}
                  autoFocus={presetReject}
                />
                <p className="text-xs text-muted-foreground">
                  {canDecide
                    ? t("portal.expense.review.noteHint")
                    : t("portal.expense.review.notePh")}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="h-10" disabled={busy} onClick={() => close(false)}>
            {t("portal.common.cancel")}
          </Button>
          {canDecide && (
            <Button
              type="button"
              variant="outline"
              className="h-10 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy || rejectDisabled}
              title={rejectDisabled ? t("portal.expense.review.rejectNoteRequired") : undefined}
              onClick={() => onAction("reject", note.trim() || null)}
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("portal.expense.review.confirmReject")}
            </Button>
          )}
          {canDecide && (
            <Button type="button" className="h-10" disabled={busy} onClick={() => onAction("approve", note.trim() || null)}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("portal.expense.review.confirmApprove")}
            </Button>
          )}
          {canPay && (
            <Button type="button" className="h-10" disabled={busy} onClick={() => onAction("mark_paid", note.trim() || null)}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("portal.expense.review.confirmPaid")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
