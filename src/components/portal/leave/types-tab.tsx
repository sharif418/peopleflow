"use client"

// Leave types tab — card grid with usage stats, add/edit dialog, guarded delete.
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { CalendarDays, Layers, Pencil, Plus, Trash2, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { LEAVE_ENDPOINTS, leaveKeys, type LeaveTypeRow, type LeaveTypesData } from "./types"
import { hueFor, leaveErrorMessage } from "./utils"
import { TypeFormDialog } from "./type-form-dialog"

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
}

export function TypesTab() {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LeaveTypeRow | null>(null)
  const [deleting, setDeleting] = useState<LeaveTypeRow | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: leaveKeys.types,
    queryFn: () => apiFetch<LeaveTypesData>(LEAVE_ENDPOINTS.types),
  })
  const items = data?.items ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(LEAVE_ENDPOINTS.typeItem(id), { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("portal.leave.toasts.typeDeleted"))
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: leaveKeys.all })
    },
    onError: (err: Error) => {
      const mapped = leaveErrorMessage(err, t)
      toast.error(mapped ?? t("portal.leave.toasts.failed"))
    },
  })

  const hasUsage = (item: LeaveTypeRow) =>
    item.approvedRequests > 0 || item.pendingRequests > 0 || item.employeesOnLeaveToday > 0

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="h-10"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" aria-hidden />
          {t("portal.leave.actions.addType")}
        </Button>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title={t("common.error")}
          description={t("portal.common.errorDesc")}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t("portal.leave.types.noData")}
          description={t("portal.leave.types.noDataDesc")}
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden />
              {t("portal.leave.actions.addType")}
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {items.map((item, index) => {
            const hue = hueFor(index)
            return (
              <motion.div key={item.id} variants={itemVariants}>
                <Card className="h-full border-border/80 bg-card shadow-xs transition-shadow hover:shadow-sm">
                  <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={cn("size-3 shrink-0 rounded-full", hue.dot)} aria-hidden />
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          aria-label={t("portal.common.edit")}
                          title={t("portal.common.edit")}
                          onClick={() => {
                            setEditing(item)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t("portal.common.delete")}
                          title={t("portal.common.delete")}
                          onClick={() => setDeleting(item)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          item.isPaid
                            ? "border-success/30 bg-success/15 text-success"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {item.isPaid ? t("portal.leave.types.paid") : t("portal.leave.types.unpaid")}
                      </Badge>
                      <Badge variant="secondary" className="font-normal">
                        {item.carryForward ? t("portal.leave.types.carry") : t("portal.leave.types.noCarry")}
                      </Badge>
                    </div>

                    <p className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold tabular-nums">
                        {t("portal.leave.types.daysPerYearUnit", { n: formatNumber(item.daysPerYear, lang) })}
                      </span>
                    </p>

                    <div className="mt-auto space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      {hasUsage(item) ? (
                        <>
                          <p className="flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" aria-hidden />
                            <span className="tabular-nums">
                              {t("portal.leave.types.approvedUsage", { n: formatNumber(item.approvedRequests, lang) })}
                              {" · "}
                              {t("portal.leave.types.pendingUsage", { n: formatNumber(item.pendingRequests, lang) })}
                            </span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Users className="size-3.5" aria-hidden />
                            <span className="tabular-nums">
                              {t("portal.leave.types.onLeaveUsage", {
                                n: formatNumber(item.employeesOnLeaveToday, lang),
                              })}
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="italic">{t("portal.leave.types.noUsage")}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {formOpen && (
        <TypeFormDialog
          open
          onOpenChange={(o) => {
            if (!o) setFormOpen(false)
          }}
          leaveType={editing}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null)
        }}
        title={t("portal.leave.types.deleteTitle")}
        description={t("portal.leave.types.deleteDesc", { name: deleting?.name ?? "" })}
        confirmLabel={t("portal.common.delete")}
        cancelLabel={t("portal.common.cancel")}
        onConfirm={() => {
          if (deleting) void deleteMutation.mutateAsync(deleting.id)
        }}
      />
    </div>
  )
}
