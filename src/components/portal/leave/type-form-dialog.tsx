"use client"

// Leave type create / edit dialog — name, yearly days, paid + carry-forward switches.
import { useMemo, useState } from "react"
import { Controller, useForm, useWatch, type Control, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { LEAVE_ENDPOINTS, leaveKeys, type LeaveTypeRow } from "./types"
import { leaveErrorMessage } from "./utils"

interface FormValues {
  name: string
  daysPerYear: string
  isPaid: boolean
  carryForward: boolean
}

function SwitchRow({
  control,
  name,
  label,
  hint,
  id,
}: {
  control: Control<FormValues>
  name: "isPaid" | "carryForward"
  label: string
  hint: string
  id: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-muted/30 p-3">
          <div className="min-w-0">
            <label htmlFor={id} className="text-sm font-medium">
              {label}
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          </div>
          <Switch id={id} checked={field.value} onCheckedChange={field.onChange} />
        </div>
      )}
    />
  )
}

export function TypeFormDialog({
  open,
  onOpenChange,
  leaveType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  leaveType: LeaveTypeRow | null
}) {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t("portal.leave.types.vName")).max(60, t("portal.leave.types.vName")),
        daysPerYear: z
          .string()
          .trim()
          .refine((v) => /^\d{1,3}$/.test(v) && Number(v) >= 1 && Number(v) <= 365, t("portal.leave.types.vDays")),
        isPaid: z.boolean(),
        carryForward: z.boolean(),
      }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: leaveType
      ? {
          name: leaveType.name,
          daysPerYear: String(leaveType.daysPerYear),
          isPaid: leaveType.isPaid,
          carryForward: leaveType.carryForward,
        }
      : { name: "", daysPerYear: "10", isPaid: true, carryForward: false },
  })

  const daysInput = useWatch({ control: form.control, name: "daysPerYear" }) ?? ""
  const daysPreview = /^\d{1,3}$/.test(daysInput.trim()) ? Number(daysInput.trim()) : null

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name.trim(),
        daysPerYear: Number(values.daysPerYear.trim()),
        isPaid: values.isPaid,
        carryForward: values.carryForward,
      }
      return leaveType
        ? apiFetch(LEAVE_ENDPOINTS.typeItem(leaveType.id), { method: "PATCH", body: JSON.stringify(payload) })
        : apiFetch(LEAVE_ENDPOINTS.types, { method: "POST", body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      toast.success(leaveType ? t("portal.leave.toasts.typeUpdated") : t("portal.leave.toasts.typeCreated"))
      void queryClient.invalidateQueries({ queryKey: leaveKeys.all })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      const mapped = leaveErrorMessage(err, t)
      setSubmitError(mapped ?? t("portal.leave.toasts.failed"))
    },
  })

  const onSubmit = (values: FormValues) => {
    setSubmitError(null)
    mutation.mutate(values)
  }

  const isEdit = leaveType !== null

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("portal.leave.types.formEditTitle") : t("portal.leave.types.formTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("portal.leave.types.formEditDesc", { name: leaveType.name })
              : t("portal.leave.types.formDesc")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.leave.types.formName")}</FormLabel>
                  <FormControl>
                    <Input className="h-10" placeholder={t("portal.leave.types.formNamePh")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="daysPerYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.leave.types.formDays")}</FormLabel>
                  <FormControl>
                    <Input className="h-10 tabular-nums" inputMode="numeric" placeholder="10" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">{t("portal.leave.types.formDaysHint")}</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {daysPreview !== null && (
              <p className="-mt-2 text-sm font-medium tabular-nums text-primary">
                {t("portal.leave.types.daysPerYearUnit", { n: formatNumber(daysPreview, lang) })}
              </p>
            )}

            <SwitchRow
              control={form.control}
              name="isPaid"
              id="leave-type-paid"
              label={t("portal.leave.types.formPaid")}
              hint={t("portal.leave.types.formPaidHint")}
            />
            <SwitchRow
              control={form.control}
              name="carryForward"
              id="leave-type-carry"
              label={t("portal.leave.types.formCarry")}
              hint={t("portal.leave.types.formCarryHint")}
            />

            {submitError && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
              >
                {submitError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                {t("portal.common.cancel")}
              </Button>
              <Button type="submit" className="h-10" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {isEdit ? t("portal.leave.types.submitUpdate") : t("portal.leave.types.submitCreate")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
