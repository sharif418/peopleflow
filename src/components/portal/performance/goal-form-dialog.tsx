"use client"

// Create goal dialog — employee combobox, title, unit select
// (%, টাকা, ইউনিট), target/current values, start/due dates, weight 1-5.
import { useMemo, useState } from "react"
import { useForm, useWatch, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Target } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmployeeCombobox } from "./employee-combobox"

import { GOAL_UNIT_OPTIONS, PERFORMANCE_ENDPOINTS, performanceKeys, type GoalRow } from "./types"
import { performanceErrorMessage } from "./utils"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

interface FormValues {
  employeeId: string
  title: string
  description: string
  unit: string
  targetValue: string
  currentValue: string
  startDate: string
  dueDate: string
  weight: string
}

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function GoalFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const today = todayLocal()

  const schema = useMemo(
    () =>
      z
        .object({
          employeeId: z.string().min(1, t("portal.performance.goalCreate.vEmployee")),
          title: z.string().trim().min(2, t("portal.performance.goalCreate.vTitle")).max(120, t("portal.performance.goalCreate.vTitle")),
          description: z.string().trim().max(500),
          unit: z.string().min(1),
          targetValue: z
            .string()
            .min(1, t("portal.performance.goalCreate.vTarget"))
            .refine((v) => Number(v) > 0 && Number.isFinite(Number(v)), t("portal.performance.goalCreate.vTarget")),
          currentValue: z
            .string()
            .refine((v) => v === "" || (Number(v) >= 0 && Number.isFinite(Number(v))), t("portal.performance.goalCreate.vCurrent")),
          startDate: z.string().min(1, t("portal.performance.goalCreate.vFrom")).regex(DATE_RE, t("portal.employees.vDateInvalid")),
          dueDate: z.string().min(1, t("portal.performance.goalCreate.vTo")).regex(DATE_RE, t("portal.employees.vDateInvalid")),
          weight: z.string().min(1),
        })
        .refine((v) => v.startDate === "" || v.dueDate === "" || v.dueDate >= v.startDate, {
          message: t("portal.performance.goalCreate.vRange"),
          path: ["dueDate"],
        }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      employeeId: "",
      title: "",
      description: "",
      unit: "",
      targetValue: "",
      currentValue: "",
      startDate: today,
      dueDate: "",
      weight: "3",
    },
  })

  const selectedUnit = useWatch({ control: form.control, name: "unit" }) ?? ""

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<GoalRow>(PERFORMANCE_ENDPOINTS.goals, {
        method: "POST",
        body: JSON.stringify({
          employeeId: values.employeeId,
          title: values.title.trim(),
          description: values.description.trim() || null,
          unit: values.unit,
          targetValue: Number(values.targetValue),
          currentValue: values.currentValue === "" ? 0 : Number(values.currentValue),
          startDate: values.startDate,
          dueDate: values.dueDate,
          weight: Number(values.weight),
        }),
      }),
    onSuccess: () => {
      toast.success(t("portal.performance.toasts.goalCreated"))
      void queryClient.invalidateQueries({ queryKey: performanceKeys.all })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      const mapped = performanceErrorMessage(err, t)
      setSubmitError(mapped ?? t("portal.performance.toasts.failed"))
    },
  })

  const onSubmit = (values: FormValues) => {
    setSubmitError(null)
    mutation.mutate(values)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!mutation.isPending) onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto pf-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="size-5 text-primary" aria-hidden />
            {t("portal.performance.goalCreate.title")}
          </DialogTitle>
          <DialogDescription>{t("portal.performance.goalCreate.desc")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Employee combobox */}
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.performance.goalCreate.employee")}</FormLabel>
                  <FormControl>
                    <EmployeeCombobox
                      value={field.value}
                      onChange={field.onChange}
                      enabled={open}
                      labelKey="portal.performance.goalCreate"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.performance.goalCreate.goalTitle")}</FormLabel>
                  <FormControl>
                    <Input className="h-10" placeholder={t("portal.performance.goalCreate.titlePh")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("portal.performance.goalCreate.description")}{" "}
                    <span className="font-normal text-muted-foreground">({t("portal.common.optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20" placeholder={t("portal.performance.goalCreate.descPh")} maxLength={500} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unit + target + current */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.performance.goalCreate.unit")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GOAL_UNIT_OPTIONS.map((u) => (
                          <SelectItem key={u.value} value={u.value} className="min-h-10">
                            {t(u.key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.performance.goalCreate.target")}</FormLabel>
                    <FormControl>
                      <Input className="h-10 tabular-nums" type="number" min="0" step="any" inputMode="decimal" placeholder="12000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.performance.goalCreate.current")}</FormLabel>
                    <FormControl>
                      <Input className="h-10 tabular-nums" type="number" min="0" step="any" inputMode="decimal" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {selectedUnit && (
              <p className="-mt-1 text-xs text-muted-foreground">{t("portal.performance.goalCreate.currentHint")}</p>
            )}

            {/* Dates + weight */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.performance.goalCreate.startDate")}</FormLabel>
                    <FormControl>
                      <Input className="h-10" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.performance.goalCreate.dueDate")}</FormLabel>
                    <FormControl>
                      <Input className="h-10" type="date" min={form.getValues("startDate") || today} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.performance.goalCreate.weight")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["1", "2", "3", "4", "5"].map((w) => (
                          <SelectItem key={w} value={w} className="min-h-10">
                            {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="-mt-1 text-xs text-muted-foreground">{t("portal.performance.goalCreate.weightHint")}</p>

            {submitError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {submitError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                {t("portal.common.cancel")}
              </Button>
              <Button type="submit" className="h-10" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {t("portal.performance.goalCreate.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
