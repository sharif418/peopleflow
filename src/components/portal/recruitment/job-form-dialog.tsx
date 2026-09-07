"use client"

// Job posting create / edit dialog — title, department, employment type,
// vacancies, description, closing date (RHF + zod, i18n-validated).
import { useMemo, useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { HrRow } from "@/components/portal/types"
import { RECRUITMENT_ENDPOINTS, recruitmentKeys, type JobPostingRow } from "./types"
import { recruitmentErrorMessage } from "./utils"

interface FormValues {
  title: string
  departmentId: string
  employmentType: string
  vacancies: string
  description: string
  closesAt: string
}

const EMPLOYMENT_OPTIONS = ["full_time", "part_time", "contract", "intern"] as const

export function JobFormDialog({
  open,
  onOpenChange,
  job,
  departments,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: JobPostingRow | null
  departments: HrRow[]
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        title: z
          .string()
          .trim()
          .min(2, t("portal.recruitment.jobForm.vTitle"))
          .max(80, t("portal.recruitment.jobForm.vTitleMax")),
        departmentId: z.string(),
        employmentType: z.enum(EMPLOYMENT_OPTIONS),
        vacancies: z
          .string()
          .trim()
          .refine((v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 99, t("portal.recruitment.jobForm.vVacancies")),
        description: z.string().trim().max(2000, t("portal.recruitment.jobForm.vDescription")),
        closesAt: z
          .string()
          .trim()
          .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), t("portal.recruitment.validation.tooLong"))
          .refine(
            (v) => v === "" || v >= new Date().toISOString().slice(0, 10),
            t("portal.recruitment.errors.past_closes_at"),
          ),
      }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: job
      ? {
          title: job.title,
          departmentId: job.departmentId ?? "none",
          employmentType: (EMPLOYMENT_OPTIONS as readonly string[]).includes(job.employmentType)
            ? (job.employmentType as (typeof EMPLOYMENT_OPTIONS)[number])
            : "full_time",
          vacancies: String(job.vacancies),
          description: job.description ?? "",
          closesAt: job.closesAt ? job.closesAt.slice(0, 10) : "",
        }
      : {
          title: "",
          departmentId: "none",
          employmentType: "full_time",
          vacancies: "1",
          description: "",
          closesAt: "",
        },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        title: values.title.trim(),
        departmentId: values.departmentId === "none" ? null : values.departmentId,
        employmentType: values.employmentType,
        vacancies: Number(values.vacancies.trim()),
        description: values.description.trim() || null,
        closesAt: values.closesAt || null,
      }
      return job
        ? apiFetch(RECRUITMENT_ENDPOINTS.jobItem(job.id), { method: "PATCH", body: JSON.stringify(payload) })
        : apiFetch(RECRUITMENT_ENDPOINTS.jobs, { method: "POST", body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      toast.success(job ? t("portal.recruitment.toasts.jobUpdated") : t("portal.recruitment.toasts.jobCreated"))
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.all })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      const mapped = recruitmentErrorMessage(err, t)
      setSubmitError(mapped ?? t("portal.recruitment.toasts.failed"))
    },
  })

  const onSubmit = (values: FormValues) => {
    setSubmitError(null)
    mutation.mutate(values)
  }

  const isEdit = job !== null

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto pf-scrollbar">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("portal.recruitment.jobForm.editTitle") : t("portal.recruitment.jobForm.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("portal.recruitment.jobForm.editDesc", { title: job.title })
              : t("portal.recruitment.jobForm.createDesc")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.recruitment.jobForm.jobTitle")}</FormLabel>
                  <FormControl>
                    <Input className="h-10" placeholder={t("portal.recruitment.jobForm.jobTitlePh")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.recruitment.jobForm.department")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder={t("portal.recruitment.jobForm.departmentPh")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      <SelectItem value="none" className="min-h-10">
                        {t("portal.recruitment.jobForm.noDepartment")}
                      </SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="min-h-10">
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.recruitment.jobForm.employmentType")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EMPLOYMENT_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type} className="min-h-10">
                            {t(`portal.recruitment.employmentType.${type}`)}
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
                name="vacancies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.recruitment.jobForm.vacancies")}</FormLabel>
                    <FormControl>
                      <Input className="h-10 tabular-nums" inputMode="numeric" placeholder="1" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t("portal.recruitment.jobForm.vacanciesHint")}</p>
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
                  <FormLabel>{t("portal.recruitment.jobForm.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-24 resize-y"
                      placeholder={t("portal.recruitment.jobForm.descriptionPh")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="closesAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.recruitment.jobForm.closesAt")}</FormLabel>
                  <FormControl>
                    <Input className="h-10" type="date" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">{t("portal.recruitment.jobForm.closesAtHint")}</p>
                  <FormMessage />
                </FormItem>
              )}
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
                {isEdit ? t("portal.recruitment.jobForm.submitUpdate") : t("portal.recruitment.jobForm.submitCreate")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
