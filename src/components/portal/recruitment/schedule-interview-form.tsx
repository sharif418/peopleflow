"use client"

// Schedule interview form (inline, inside the detail dialog) — round, mode,
// date, time, interviewer. Client zod mirrors the server validation.
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"
import { CalendarPlus, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RECRUITMENT_ENDPOINTS, recruitmentKeys } from "./types"
import { recruitmentErrorMessage } from "./utils"

interface FormValues {
  round: string
  mode: string
  date: string
  time: string
  interviewer: string
}

const MODES = ["onsite", "phone", "video"] as const

function toLocalDatetime(date: string, time: string): string {
  return `${date}T${time.length === 5 ? time : `${time}:00`}`
}

export function ScheduleInterviewForm({
  applicationId,
  nextRound,
  onScheduled,
}: {
  applicationId: string
  nextRound: number
  onScheduled: () => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        round: z
          .string()
          .trim()
          .refine((v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 10, t("portal.recruitment.interviews.vRound")),
        mode: z.enum(MODES),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("portal.recruitment.interviews.vDateTime")),
        time: z.string().regex(/^\d{2}:\d{2}$/, t("portal.recruitment.interviews.vDateTime")),
        interviewer: z.string().trim().max(60, t("portal.recruitment.validation.tooLong")),
      }).refine(
        (v) => new Date(`${v.date}T${v.time}`).getTime() > Date.now(),
        t("portal.recruitment.interviews.vFuture"),
      ),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      round: String(nextRound),
      mode: "onsite",
      date: "",
      time: "10:00",
      interviewer: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch(RECRUITMENT_ENDPOINTS.interviews(applicationId), {
        method: "POST",
        body: JSON.stringify({
          round: Number(values.round),
          mode: values.mode,
          scheduledAt: toLocalDatetime(values.date, values.time),
          interviewer: values.interviewer.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast.success(t("portal.recruitment.toasts.interviewScheduled"))
      setSubmitError(null)
      form.reset({ round: String(nextRound), mode: "onsite", date: "", time: "10:00", interviewer: "" })
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.all })
      onScheduled()
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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-4"
      >
        <p className="text-sm font-semibold">{t("portal.recruitment.interviews.scheduleTitle")}</p>
        <p className="-mt-2 text-xs text-muted-foreground">{t("portal.recruitment.interviews.scheduleDesc")}</p>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="round"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("portal.recruitment.interviews.roundLabel")}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(nextRound)} className="min-h-10">
                        {t("portal.recruitment.interviews.nextRound", { n: nextRound })}
                      </SelectItem>
                      {Array.from({ length: 10 }, (_, i) => i + 1)
                        .filter((n) => n !== nextRound)
                        .map((n) => (
                          <SelectItem key={n} value={String(n)} className="min-h-10">
                            {t("portal.recruitment.interviews.round", { n })}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("portal.recruitment.interviews.modeLabel")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MODES.map((m) => (
                      <SelectItem key={m} value={m} className="min-h-10">
                        {t(`portal.recruitment.interviews.mode.${m}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("portal.recruitment.interviews.dateLabel")}</FormLabel>
                <FormControl>
                  <Input className="h-10" type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("portal.recruitment.interviews.timeLabel")}</FormLabel>
                <FormControl>
                  <Input className="h-10 tabular-nums" type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="interviewer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("portal.recruitment.interviews.interviewerLabel")}</FormLabel>
              <FormControl>
                <Input className="h-10" placeholder={t("portal.recruitment.interviews.interviewerPh")} {...field} />
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

        <Button type="submit" className="h-10 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <CalendarPlus className="size-4" aria-hidden />
          )}
          {t("portal.recruitment.interviews.submitSchedule")}
        </Button>
      </form>
    </Form>
  )
}
