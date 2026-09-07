"use client"

// Attendance module — manual punch upsert dialog (per employee + date)
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PenLine } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ATT_ENDPOINTS, type AttendanceDayItem } from "./attendance-types"
import { attendanceDateLabel, attendanceStatusLabel, formatWorkedHours } from "./attendance-labels"

const GRACE_MINUTES = 10
const LUNCH_MINUTES = 60

const STATUS_OPTIONS = ["auto", "present", "late", "half_day", "absent", "on_leave"] as const
type StatusChoice = (typeof STATUS_OPTIONS)[number]

const STATUS_KEYS: Record<StatusChoice, string> = {
  auto: "portal.attendance.punch.statusAuto",
  present: "portal.attendance.punch.statusPresent",
  late: "portal.attendance.punch.statusLate",
  half_day: "portal.attendance.punch.statusHalfDay",
  absent: "portal.attendance.punch.statusAbsent",
  on_leave: "portal.attendance.punch.statusOnLeave",
}

function timeToMinutes(t: string): number {
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
}

export function PunchDialog({
  item,
  date,
  open,
  onOpenChange,
}: {
  item: AttendanceDayItem | null
  date: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()

  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [status, setStatus] = useState<StatusChoice>("auto")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Reset form whenever a new row is opened
  const formKey = open ? `${item?.employeeId ?? ""}:${date}` : "closed"
  const [lastKey, setLastKey] = useState("")
  if (formKey !== lastKey && item) {
    setLastKey(formKey)
    setCheckIn(item.checkIn ?? "")
    setCheckOut(item.checkOut ?? "")
    // keep explicit (non-computable) statuses selected; present/late recompute from shift
    setStatus(
      item.status === "on_leave" || item.status === "absent" || item.status === "half_day"
        ? (item.status as StatusChoice)
        : "auto",
    )
    setNote(item.note ?? "")
    setError(null)
  }

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(ATT_ENDPOINTS.day, {
        method: "POST",
        body: JSON.stringify({
          employeeId: item?.employeeId,
          date,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          status: status === "auto" ? null : status,
          note: note.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast.success(t("portal.attendance.punch.saved"))
      void queryClient.invalidateQueries({ queryKey: ["org", "attendance"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "overview"] })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      if (err.message === "invalid_time_range") setError(t("portal.attendance.punch.vTimeRange"))
      else if (err.message === "invalid_employee") setError(t("portal.attendance.errors.invalidEmployee"))
      else setError(t("portal.attendance.punch.saveFailed"))
    },
  })

  // live preview of the computed result
  const preview = useMemo(() => {
    if (!item) return null
    const shiftStart = item.shiftStart ?? "09:00"
    if (!checkIn) return null
    const late = timeToMinutes(checkIn) > timeToMinutes(shiftStart) + GRACE_MINUTES
    let worked = 0
    if (checkOut) worked = Math.max(0, timeToMinutes(checkOut) - timeToMinutes(checkIn) - LUNCH_MINUTES)
    return { late, worked }
  }, [item, checkIn, checkOut])

  const submit = () => {
    setError(null)
    if (!item) return
    if (checkIn && checkOut && timeToMinutes(checkOut) <= timeToMinutes(checkIn)) {
      setError(t("portal.attendance.punch.vTimeRange"))
      return
    }
    if (!checkIn && status === "auto") {
      setError(t("portal.attendance.punch.vNeedOne"))
      return
    }
    mutation.mutate()
  }

  if (!item) return null
  const name = `${item.firstName} ${item.lastName}`
  const shiftStart = item.shiftStart ?? "09:00"
  const shiftEnd = item.shiftEnd ?? "18:00"

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="size-5 text-primary" aria-hidden />
            {item.checkIn || item.status ? t("portal.attendance.punch.editTitle") : t("portal.attendance.punch.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("portal.attendance.punch.desc", {
              name,
              code: item.employeeCode,
              date: attendanceDateLabel(date, lang),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="bg-primary/12 font-mono text-[11px] text-primary">
              {item.employeeCode}
            </Badge>
            <span className="truncate">{t("portal.attendance.punch.shiftHint", { start: shiftStart, end: shiftEnd })}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="punch-in">{t("portal.attendance.punch.checkIn")}</Label>
              <Input
                id="punch-in"
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="h-10 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="punch-out">{t("portal.attendance.punch.checkOut")}</Label>
              <Input
                id="punch-out"
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="h-10 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="punch-status">{t("portal.attendance.punch.statusField")}</Label>
            <Select value={status} onValueChange={(v) => setStatus((v ?? "auto") as StatusChoice)}>
              <SelectTrigger id="punch-status" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(STATUS_KEYS[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="punch-note">
              {t("portal.attendance.punch.note")}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({t("portal.common.optional")})
              </span>
            </Label>
            <Input
              id="punch-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("portal.attendance.punch.notePh")}
              className="h-10"
              maxLength={200}
            />
          </div>

          {preview && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                {status === "auto"
                  ? attendanceStatusLabel(preview.late ? "late" : "present", t)
                  : attendanceStatusLabel(status, t)}
              </span>
              <span className="font-medium tabular-nums">
                {t("portal.attendance.punch.workedPreview", {
                  h: formatWorkedHours(preview.worked, lang),
                })}
              </span>
            </div>
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => {
              setCheckIn("")
              setCheckOut("")
              setStatus("auto")
              setNote("")
              setError(null)
            }}
          >
            {t("portal.attendance.punch.clear")}
          </Button>
          <Button disabled={mutation.isPending} onClick={submit}>
            {mutation.isPending ? t("portal.attendance.punch.saving") : t("portal.attendance.punch.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
