"use client"

// New expense claim dialog — searchable employee combobox, title, category
// select (Bengali labels), expense date, description and the dynamic
// line-items editor with live total. Mirrors the leave create dialog.
import { useMemo, useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Receipt } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EXPENSE_CATEGORIES, EXPENSE_ENDPOINTS, expenseKeys, type ClaimDetail } from "./types"
import { categoryLabel, categoryMeta, expenseErrorMessage } from "./utils"
import { EmployeeCombobox } from "./employee-combobox"
import { ItemsEditor } from "./items-editor"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface FormValues {
  employeeId: string
  title: string
  category: string
  expenseDate: string
  description: string
  items: { label: string; amount: string; note: string }[]
}

const DEFAULT_VALUES: FormValues = {
  employeeId: "",
  title: "",
  category: "",
  expenseDate: "",
  description: "",
  items: [{ label: "", amount: "", note: "" }],
}

export function ClaimFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const today = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [])

  const schema = useMemo(
    () =>
      z.object({
        employeeId: z.string().min(1, t("portal.expense.create.vEmployee")),
        title: z.string().trim().min(2, t("portal.expense.create.vTitle")).max(120, t("portal.expense.create.vTitle")),
        category: z.string().min(1, t("portal.expense.create.selectCategory")),
        expenseDate: z.string().min(1, t("portal.expense.create.vDate")).regex(DATE_RE, t("portal.employees.vDateInvalid")),
        description: z.string().trim().max(500),
        items: z
          .array(
            z.object({
              label: z.string().trim().min(2, t("portal.expense.create.vItemLabel")).max(80, t("portal.expense.create.vItemLabel")),
              amount: z.string().trim().min(1, t("portal.expense.create.vItemAmount")),
              note: z.string().trim().max(200, t("portal.expense.create.vItemNote")),
            }),
          )
          .min(1, t("portal.expense.create.vItems")),
      }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: DEFAULT_VALUES,
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<ClaimDetail>(EXPENSE_ENDPOINTS.claims, {
        method: "POST",
        body: JSON.stringify({
          employeeId: values.employeeId,
          title: values.title.trim(),
          category: values.category,
          expenseDate: values.expenseDate,
          description: values.description.trim() || null,
          items: values.items.map((i) => ({
            label: i.label.trim(),
            amount: Number(i.amount),
            note: i.note.trim() || null,
          })),
        }),
      }),
    onSuccess: () => {
      toast.success(t("portal.expense.toasts.claimCreated"))
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      form.reset(DEFAULT_VALUES)
      setSubmitError(null)
      onOpenChange(false)
    },
    onError: (err: Error) => {
      const mapped = expenseErrorMessage(err, t)
      setSubmitError(mapped ?? t("portal.expense.toasts.failed"))
    },
  })

  const onSubmit = (values: FormValues) => {
    setSubmitError(null)
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!mutation.isPending) onOpenChange(o) }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("portal.expense.create.title")}</DialogTitle>
          <DialogDescription>{t("portal.expense.create.desc")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Searchable employee combobox */}
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.expense.create.employee")}</FormLabel>
                    <FormControl>
                      <EmployeeCombobox value={field.value} onChange={field.onChange} enabled={open} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category select */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.expense.create.categoryLabel")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder={t("portal.expense.create.selectCategory")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => {
                          const meta = categoryMeta(cat)
                          const CatIcon = meta.icon
                          return (
                            <SelectItem key={cat} value={cat} className="min-h-10">
                              <span className="flex items-center gap-2">
                                <CatIcon className="size-4" aria-hidden />
                                {categoryLabel(cat, t)}
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.expense.create.claimTitle")}</FormLabel>
                    <FormControl>
                      <Input className="h-10" placeholder={t("portal.expense.create.claimTitlePh")} maxLength={120} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.expense.create.expenseDate")}</FormLabel>
                    <FormControl>
                      <Input className="h-10 w-full sm:w-40" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("portal.expense.create.descriptionLabel")}{" "}
                    <span className="font-normal text-muted-foreground">({t("portal.common.optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20" placeholder={t("portal.expense.create.descriptionPh")} maxLength={500} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic items + live total */}
            <ItemsEditor />

            {submitError && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
              >
                {submitError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                {t("portal.common.cancel")}
              </Button>
              <Button type="submit" className="h-10" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Receipt className="size-4" aria-hidden />}
                {t("portal.expense.create.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
