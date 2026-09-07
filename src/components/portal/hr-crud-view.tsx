"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Briefcase, Clock, MapPin, Network, Pencil, Plus, Trash2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { HR_ENDPOINTS, orgKeys } from "./api"
import type { HrResource, HrRow } from "./types"

const RESOURCE_META: Record<
  HrResource,
  { icon: typeof Network; prefix: string; hasAddress: boolean; hasTimes: boolean }
> = {
  departments: { icon: Network, prefix: "portal.depts", hasAddress: false, hasTimes: false },
  designations: { icon: Briefcase, prefix: "portal.desigs", hasAddress: false, hasTimes: false },
  branches: { icon: MapPin, prefix: "portal.branches", hasAddress: true, hasTimes: false },
  shifts: { icon: Clock, prefix: "portal.shifts", hasAddress: false, hasTimes: true },
}

interface FormState {
  name: string
  address: string
  startTime: string
  endTime: string
}

const EMPTY_FORM: FormState = { name: "", address: "", startTime: "09:00", endTime: "18:00" }

function AddEditDialog({
  resource,
  row,
  open,
  onOpenChange,
}: {
  resource: HrResource
  row: HrRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const meta = RESOURCE_META[resource]
  const prefix = meta.prefix
  const [form, setForm] = useState<FormState>(() =>
    row
      ? {
          name: row.name,
          address: row.address ?? "",
          startTime: row.startTime ?? "09:00",
          endTime: row.endTime ?? "18:00",
        }
      : { ...EMPTY_FORM },
  )
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { name: form.name.trim() }
      if (meta.hasAddress) body.address = form.address.trim() || null
      if (meta.hasTimes) {
        body.startTime = form.startTime
        body.endTime = form.endTime
      }
      return row
        ? apiFetch(`${HR_ENDPOINTS[resource]}/${row.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : apiFetch(HR_ENDPOINTS[resource], { method: "POST", body: JSON.stringify(body) })
    },
    onSuccess: () => {
      toast.success(row ? t(`${prefix}.successUpdated`) : t(`${prefix}.successCreated`))
      void queryClient.invalidateQueries({ queryKey: ["org", resource] })
      void queryClient.invalidateQueries({ queryKey: ["org", "overview"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "employees"] })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      if (err.message === "name_taken") setError(t(`${prefix}.nameTaken`))
      else setError(t("portal.common.operationFailed"))
    },
  })

  const submit = () => {
    setError(null)
    const name = form.name.trim()
    if (name.length < 2) {
      setError(t(`${prefix}.vName`))
      return
    }
    if (meta.hasTimes && (!form.startTime || !form.endTime)) {
      setError(t("portal.shifts.vTime"))
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{row ? t(`${prefix}.edit`) : t(`${prefix}.add`)}</DialogTitle>
          <DialogDescription>{t(`${prefix}.subtitle`)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`hr-${resource}-name`}>{t(`${prefix}.formName`)}</Label>
            <Input
              id={`hr-${resource}-name`}
              className="h-10"
              placeholder={t(`${prefix}.namePh`)}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          {meta.hasAddress && (
            <div className="space-y-1.5">
              <Label htmlFor={`hr-${resource}-address`}>{t("portal.branches.addressOptional")}</Label>
              <Input
                id={`hr-${resource}-address`}
                className="h-10"
                placeholder={t("portal.branches.addressPh")}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
          )}
          {meta.hasTimes && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`hr-${resource}-start`}>{t("portal.common.startTime")}</Label>
                <Input
                  id={`hr-${resource}-start`}
                  className="h-10 tabular-nums"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`hr-${resource}-end`}>{t("portal.common.endTime")}</Label>
                <Input
                  id={`hr-${resource}-end`}
                  className="h-10 tabular-nums"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t("portal.common.cancel")}
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? t("portal.common.saving") : row ? t("portal.common.save") : t("portal.common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function HrCrudView({ resource }: { resource: HrResource }) {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()
  const meta = RESOURCE_META[resource]
  const prefix = meta.prefix
  const Icon = meta.icon

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<HrRow | null>(null)
  const [deleting, setDeleting] = useState<HrRow | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: orgKeys.hr(resource),
    queryFn: () => apiFetch<HrRow[]>(HR_ENDPOINTS[resource]),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`${HR_ENDPOINTS[resource]}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t(`${prefix}.successDeleted`))
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ["org", resource] })
      void queryClient.invalidateQueries({ queryKey: ["org", "overview"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "employees"] })
    },
    onError: () => toast.error(t("portal.common.operationFailed")),
  })

  const rows = useMemo(() => data ?? [], [data])

  const deleteDesc =
    deleting && deleting.employeesCount > 0
      ? t(`${prefix}.deleteDesc`, { n: formatNumber(deleting.employeesCount, lang) })
      : t(`${prefix}.deleteDescZero`)

  return (
    <div className="space-y-4">
      <PageHeader
        title={t(`${prefix}.title`)}
        subtitle={t(`${prefix}.subtitle`)}
        icon={Icon}
        actions={
          <Button
            className="h-10"
            onClick={() => {
              setEditingRow(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" aria-hidden />
            {t(`${prefix}.add`)}
          </Button>
        }
      />

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
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
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Icon}
          title={t(`${prefix}.noData`)}
          description={t(`${prefix}.noDataDesc`)}
          action={
            <Button
              onClick={() => {
                setEditingRow(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden />
              {t(`${prefix}.add`)}
            </Button>
          }
        />
      ) : (
        <ul
          className={cn(
            "max-h-96 space-y-2 overflow-y-auto pf-scrollbar pr-1",
            rows.length > 7 && "pb-1",
          )}
        >
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-xs transition-shadow hover:shadow-sm sm:p-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{row.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {t("portal.common.employeesCount")}:{" "}
                    {formatNumber(row.employeesCount, lang)} {t("portal.common.person")}
                  </span>
                  {meta.hasAddress && row.address && (
                    <span className="truncate">{row.address}</span>
                  )}
                  {meta.hasTimes && row.startTime && row.endTime && (
                    <Badge variant="outline" className="font-mono text-[10px] font-normal tabular-nums">
                      {row.startTime}–{row.endTime}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label={t("portal.common.edit")}
                  title={t("portal.common.edit")}
                  onClick={() => {
                    setEditingRow(row)
                    setDialogOpen(true)
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
                  onClick={() => setDeleting(row)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialogOpen && (
        <AddEditDialog
          key={editingRow?.id ?? "new"}
          resource={resource}
          row={editingRow}
          open={dialogOpen}
          onOpenChange={(o) => {
            if (!o) setDialogOpen(false)
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null)
        }}
        title={t(`${prefix}.deleteTitle`)}
        description={deleteDesc}
        confirmLabel={t("portal.common.delete")}
        cancelLabel={t("portal.common.cancel")}
        onConfirm={() => {
          if (deleting) void deleteMutation.mutateAsync(deleting.id)
        }}
      />
    </div>
  )
}
