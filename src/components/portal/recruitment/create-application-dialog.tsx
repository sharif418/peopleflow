"use client"

// Create application dialog — add a walk-in / phone candidate to an open posting.
// Fields: job, name, email?, phone (BD), expected salary (৳), cover note?.
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"
import { Loader2, UserPlus } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RECRUITMENT_ENDPOINTS, recruitmentKeys, type JobPostingRow } from "./types"
import { recruitmentErrorMessage } from "./utils"

interface FormValues {
  jobPostingId: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string
  expectedSalary: string
  coverNote: string
}

const BD_PHONE_RE = /^(?:\+?880|0)1[3-9]\d{8}$/

export function CreateApplicationDialog({
  open,
  onOpenChange,
  jobs,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobs: JobPostingRow[]
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const openJobs = useMemo(() => jobs.filter((j) => j.status !== "closed"), [jobs])

  const schema = useMemo(
    () =>
      z.object({
        jobPostingId: z.string().min(1, t("portal.recruitment.createApplication.vJob")),
        candidateName: z
          .string()
          .trim()
          .min(2, t("portal.recruitment.createApplication.vName"))
          .max(80, t("portal.recruitment.createApplication.vName")),
        candidateEmail: z
          .string()
          .trim()
          .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), t("portal.recruitment.createApplication.vEmail")),
        candidatePhone: z
          .string()
          .trim()
          .refine((v) => v === "" || BD_PHONE_RE.test(v), t("portal.recruitment.createApplication.vPhone")),
        expectedSalary: z
          .string()
          .trim()
          .refine(
            (v) => v === "" || (/^\d{1,7}$/.test(v) && Number(v) <= 9_999_999),
            t("portal.recruitment.createApplication.vSalary"),
          ),
        coverNote: z.string().trim().max(1000, t("portal.recruitment.validation.tooLong")),
      }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      jobPostingId: "",
      candidateName: "",
      candidateEmail: "",
      candidatePhone: "",
      expectedSalary: "",
      coverNote: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch(RECRUITMENT_ENDPOINTS.applications, {
        method: "POST",
        body: JSON.stringify({
          jobPostingId: values.jobPostingId,
          candidateName: values.candidateName.trim(),
          candidateEmail: values.candidateEmail.trim() || null,
          candidatePhone: values.candidatePhone.trim() || null,
          expectedSalary: values.expectedSalary.trim() || null,
          coverNote: values.coverNote.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast.success(t("portal.recruitment.toasts.applicationCreated"))
      setSubmitError(null)
      form.reset()
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

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto pf-scrollbar">
        <DialogHeader>
          <DialogTitle>{t("portal.recruitment.createApplication.title")}</DialogTitle>
          <DialogDescription>{t("portal.recruitment.createApplication.desc")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="jobPostingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.recruitment.createApplication.job")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder={t("portal.recruitment.createApplication.jobPh")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {openJobs.map((j) => (
                        <SelectItem key={j.id} value={j.id} className="min-h-10">
                          {j.title}
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
              name="candidateName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.recruitment.createApplication.name")}</FormLabel>
                  <FormControl>
                    <Input className="h-10" placeholder={t("portal.recruitment.createApplication.namePh")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="candidateEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.recruitment.createApplication.email")}</FormLabel>
                  <FormControl>
                    <Input className="h-10" type="email" inputMode="email" placeholder={t("portal.recruitment.createApplication.emailPh")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="candidatePhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.recruitment.createApplication.phone")}</FormLabel>
                  <FormControl>
                    <Input className="h-10 tabular-nums" inputMode="tel" placeholder={t("portal.recruitment.createApplication.phonePh")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.recruitment.createApplication.expectedSalary")}</FormLabel>
                  <FormControl>
                    <Input className="h-10 tabular-nums" inputMode="numeric" placeholder={t("portal.recruitment.createApplication.expectedSalaryPh")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coverNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("portal.recruitment.createApplication.coverNote")}</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-20 resize-y" placeholder={t("portal.recruitment.createApplication.coverNotePh")} {...field} />
                  </FormControl>
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
              <Button type="submit" className="h-10" disabled={mutation.isPending || openJobs.length === 0}>
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <UserPlus className="size-4" aria-hidden />
                )}
                {t("portal.recruitment.createApplication.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
