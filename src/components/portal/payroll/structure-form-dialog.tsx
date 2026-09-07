"use client"

// Create / edit salary structure — component rows builder with BD validation.
// Form state initializes directly from `editing` (parent remounts via key when
// the dialog opens), so no reset effects are needed.
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StructureRowsEditor } from "./structure-rows-editor"
import type { ComponentFormRow, SalaryStructureRow } from "./types"

function emptyRow(): ComponentFormRow {
  return { name: "", abbr: "", type: "earning", calcType: "percent", value: "" }
}

function validate(
  name: string,
  rows: ComponentFormRow[],
  t: (k: string) => string,
): string | null {
  if (name.trim().length < 2) return t("portal.payroll.errNameRequired")
  const earnings = rows.filter((r) => r.type === "earning")
  if (earnings.length === 0) return t("portal.payroll.errMinEarning")
  let percentSum = 0
  for (const r of rows) {
    if (r.name.trim().length < 2) return t("portal.payroll.errCompNameRequired")
    if (!/^[A-Z][A-Z0-9]{1,7}$/.test(r.abbr.trim())) return t("portal.payroll.errAbbr")
    const value = Number(r.value)
    if (!Number.isFinite(value) || value < 0) return t("portal.payroll.errValueInvalid")
    if (r.calcType === "percent") {
      if (value > 100) return t("portal.payroll.errPercentRange")
      if (r.type === "earning") percentSum += value
    }
  }
  if (percentSum > 100) return t("portal.payroll.errPercentSum")
  return null
}

export function StructureFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: SalaryStructureRow | null
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [name, setName] = useState(editing?.name ?? "")
  const [rows, setRows] = useState<ComponentFormRow[]>(() =>
    editing && editing.components.length > 0
      ? editing.components.map((c) => ({
          name: c.name,
          abbr: c.abbr,
          type: c.type,
          calcType: c.calcType,
          value: String(c.value),
        }))
      : [emptyRow()],
  )
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: { name: string; components: unknown[] }) =>
      editing
        ? apiFetch(`/api/org/payroll/structures/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : apiFetch("/api/org/payroll/structures", {
            method: "POST",
            body: JSON.stringify(payload),
          }),
    onSuccess: () => {
      toast.success(
        editing ? t("portal.payroll.toastStructureUpdated") : t("portal.payroll.toastStructureCreated"),
      )
      onOpenChange(false)
      void queryClient.invalidateQueries({ queryKey: ["org", "payroll"] })
    },
    onError: (err: Error) => {
      const map: Record<string, string> = {
        name_taken: t("portal.payroll.errNameTaken"),
        min_earning: t("portal.payroll.errMinEarning"),
        percent_range: t("portal.payroll.errPercentRange"),
        percent_sum: t("portal.payroll.errPercentSum"),
      }
      const code = err.message.startsWith("validation_failed") ? "validation_failed" : err.message
      toast.error(map[code] ?? t("portal.payroll.toastSaveFailed"))
    },
  })

  const updateRow = (i: number, patch: Partial<ComponentFormRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const submit = () => {
    const vErr = validate(name, rows, t)
    if (vErr) {
      setError(vErr)
      return
    }
    setError(null)
    mutation.mutate({
      name: name.trim(),
      components: rows.map((r) => ({
        name: r.name.trim(),
        abbr: r.abbr.trim().toUpperCase(),
        type: r.type,
        calcType: r.calcType,
        value: Number(r.value),
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto pf-scrollbar sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("portal.payroll.formEditTitle") : t("portal.payroll.formNewTitle")}
          </DialogTitle>
          <DialogDescription>{t("portal.payroll.formNewDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="structure-name">{t("portal.payroll.fieldNameLabel")}</Label>
            <Input
              id="structure-name"
              value={name}
              maxLength={60}
              placeholder={t("portal.payroll.fieldNamePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <StructureRowsEditor
            rows={rows}
            updateRow={updateRow}
            removeRow={(i) => setRows((prev) => prev.filter((_, idx) => idx !== i))}
            addRow={() => setRows((prev) => [...prev, emptyRow()])}
          />

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("portal.common.cancel")}
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t("portal.common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
