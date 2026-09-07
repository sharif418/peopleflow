"use client"

// Approve / Reject note dialog — shows the request summary and an optional note.
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
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
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import type { LeaveRequestRow } from "./types"
import { formatLeaveRange, type LeaveHue } from "./utils"

export function ReviewDialog({
  open,
  onOpenChange,
  request,
  action,
  hue,
  busy,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: LeaveRequestRow | null
  action: "approve" | "reject"
  hue: LeaveHue | null
  busy: boolean
  onSubmit: (note: string) => void
}) {
  const { lang, t } = useI18n()
  const [note, setNote] = useState("")

  const isApprove = action === "approve"
  const name = request ? `${request.employee.firstName} ${request.employee.lastName}` : ""
  const code = request?.employee.employeeCode ?? ""

  const close = (o: boolean) => {
    if (!busy) {
      if (!o) setNote("")
      onOpenChange(o)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isApprove ? t("portal.leave.review.approveTitle") : t("portal.leave.review.rejectTitle")}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? t("portal.leave.review.approveDesc", {
                  name,
                  code,
                  days: formatNumber(request?.days ?? 0, lang),
                  type: request?.leaveType.name ?? "",
                })
              : t("portal.leave.review.rejectDesc", { name, code })}
          </DialogDescription>
        </DialogHeader>

        {request && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className={cn("font-medium", hue?.badge)}>
                {request.leaveType.name}
              </Badge>
              <span className="tabular-nums">
                {t("portal.leave.requests.daysUnit", { n: formatNumber(request.days, lang) })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span>{t("portal.leave.review.summaryRange")}</span>
              <span className="tabular-nums">{formatLeaveRange(request.fromDate, request.toDate, lang)}</span>
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="leave-review-note">{t("portal.leave.review.noteLabel")}</Label>
          <Textarea
            id="leave-review-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("portal.leave.review.notePh")}
            className="min-h-20"
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground">{t("portal.leave.review.noteHint")}</p>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="h-10" disabled={busy} onClick={() => close(false)}>
            {t("portal.common.cancel")}
          </Button>
          <Button
            type="button"
            className={cn(
              "h-10",
              !isApprove && "bg-destructive text-white hover:bg-destructive/90",
            )}
            disabled={busy}
            onClick={() => onSubmit(note)}
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isApprove ? t("portal.leave.review.confirmApprove") : t("portal.leave.review.confirmReject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
