"use client"

// New leave request dialog — searchable employee combobox, type select,
// native date inputs with a live working-days preview and balance warnings.
import { useMemo, useState } from "react"
import { useForm, useWatch, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import { CalendarRange, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { EmployeesPage } from "../types"
import {
  LEAVE_ENDPOINTS,
  leaveKeys,
  type LeaveBalancesData,
  type LeaveRequestRow,
  type LeaveTypeRow,
} from "./types"
import { leaveErrorMessage, workingDaysClient } from "./utils"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

interface FormValues {
  employeeId: string
  leaveTypeId: string
  fromDate: string
  toDate: string
  reason: string
}

export function CreateRequestDialog({
  open,
  onOpenChange,
  types,
  typesLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  types: LeaveTypeRow[]
  typesLoading: boolean
}) {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [employeeOpen, setEmployeeOpen] = useState(false)

  const currentYear = String(new Date().getFullYear())
  const yesterday = useMemo(() => {
    const d = new Date(Date.now() - 86_400_000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [])

  const schema = useMemo(
    () =>
      z
        .object({
          employeeId: z.string().min(1, t("portal.leave.create.vEmployee")),
          leaveTypeId: z.string().min(1, t("portal.leave.create.vType")),
          fromDate: z.string().min(1, t("portal.leave.create.vFrom")).regex(DATE_RE, t("portal.employees.vDateInvalid")),
          toDate: z.string().min(1, t("portal.leave.create.vTo")).regex(DATE_RE, t("portal.employees.vDateInvalid")),
          reason: z.string().trim().max(300),
        })
        .refine((v) => v.fromDate === "" || v.toDate === "" || v.toDate >= v.fromDate, {
          message: t("portal.leave.create.vRange"),
          path: ["toDate"],
        })
        .refine((v) => v.fromDate === "" || v.fromDate >= yesterday, {
          message: t("portal.leave.create.vPast"),
          path: ["fromDate"],
        })
        .refine((v) => v.fromDate === "" || v.toDate === "" || Math.round((new Date(v.toDate).getTime() - new Date(v.fromDate).getTime()) / 86_400_000) + 1 <= 90, {
          message: t("portal.leave.create.vSpan"),
          path: ["toDate"],
        }),
    [t, yesterday],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { employeeId: "", leaveTypeId: "", fromDate: "", toDate: "", reason: "" },
  })

  const employeesQuery = useQuery({
    queryKey: ["org", "leave", "employee-options"],
    queryFn: () => apiFetch<EmployeesPage>("/api/org/employees?pageSize=100&status=active"),
    enabled: open,
    staleTime: 60_000,
  })
  const employees = employeesQuery.data?.items ?? []

  const selectedId = useWatch({ control: form.control, name: "employeeId" }) ?? ""
  const selectedTypeId = useWatch({ control: form.control, name: "leaveTypeId" }) ?? ""
  const fromDate = useWatch({ control: form.control, name: "fromDate" }) ?? ""
  const toDate = useWatch({ control: form.control, name: "toDate" }) ?? ""

  // Live balance lookup for the selected employee + type (current year).
  const balancesQuery = useQuery({
    queryKey: leaveKeys.balances(currentYear),
    queryFn: () => apiFetch<LeaveBalancesData>(LEAVE_ENDPOINTS.balances(currentYear)),
    enabled: open && selectedId !== "" && selectedTypeId !== "",
    staleTime: 30_000,
  })

  const balanceRow = useMemo(() => {
    if (selectedId === "" || selectedTypeId === "") return null
    const emp = balancesQuery.data?.items.find((e) => e.employeeId === selectedId)
    return emp?.rows.find((r) => r.leaveTypeId === selectedTypeId) ?? null
  }, [balancesQuery.data, selectedId, selectedTypeId])

  const previewDays = useMemo(
    () => (fromDate && toDate ? workingDaysClient(fromDate, toDate) : 0),
    [fromDate, toDate],
  )

  const selectedEmployee = employees.find((e) => e.id === selectedId) ?? null
  const selectedType = types.find((ty) => ty.id === selectedTypeId) ?? null

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<LeaveRequestRow>(LEAVE_ENDPOINTS.requests, {
        method: "POST",
        body: JSON.stringify({
          employeeId: values.employeeId,
          leaveTypeId: values.leaveTypeId,
          fromDate: values.fromDate,
          toDate: values.toDate,
          reason: values.reason.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast.success(t("portal.leave.toasts.requestCreated"))
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

  const bothDates = fromDate !== "" && toDate !== ""
  const overBalance = balanceRow !== null && bothDates && previewDays > balanceRow.remaining

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!mutation.isPending) onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("portal.leave.create.title")}</DialogTitle>
          <DialogDescription>{t("portal.leave.create.desc")}</DialogDescription>
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
                    <FormLabel>{t("portal.leave.create.employee")}</FormLabel>
                    <FormControl>
                      <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={employeeOpen}
                            className="h-10 w-full justify-between font-normal"
                          >
                            {selectedEmployee ? (
                              <span className="flex min-w-0 items-center gap-2">
                                <Avatar className="size-6">
                                  <AvatarFallback className="bg-primary/12 text-[9px] font-semibold text-primary">
                                    {initialsOf(`${selectedEmployee.firstName} ${selectedEmployee.lastName}`)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">
                                  {selectedEmployee.firstName} {selectedEmployee.lastName}{" "}
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {selectedEmployee.employeeCode}
                                  </span>
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{t("portal.leave.create.selectEmployee")}</span>
                            )}
                            <ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(28rem,var(--radix-popover-trigger-width))] p-0" align="start">
                          <Command>
                            <CommandInput placeholder={t("portal.leave.create.searchEmployee")} />
                            <CommandList className="max-h-72 overflow-y-auto">
                              <CommandEmpty>{t("portal.leave.create.noEmployee")}</CommandEmpty>
                              <CommandGroup>
                                {employees.map((emp) => (
                                  <CommandItem
                                    key={emp.id}
                                    value={`${emp.firstName} ${emp.lastName} ${emp.employeeCode}`}
                                    onSelect={() => {
                                      field.onChange(emp.id)
                                      setEmployeeOpen(false)
                                    }}
                                    className="min-h-10"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-1 size-4",
                                        selectedId === emp.id ? "opacity-100" : "opacity-0",
                                      )}
                                      aria-hidden
                                    />
                                    <span className="truncate">
                                      {emp.firstName} {emp.lastName}
                                    </span>
                                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                                      {emp.employeeCode}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Leave type select */}
              <FormField
                control={form.control}
                name="leaveTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.leave.create.leaveType")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={typesLoading}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder={t("portal.leave.create.selectType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {types.length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            {t("portal.employees.noOptions")}
                          </div>
                        )}
                        {types.map((ty) => (
                          <SelectItem key={ty.id} value={ty.id} className="min-h-10">
                            {ty.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fromDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.leave.create.fromDate")}</FormLabel>
                    <FormControl>
                      <Input className="h-10" type="date" min={yesterday} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.leave.create.toDate")}</FormLabel>
                    <FormControl>
                      <Input className="h-10" type="date" min={fromDate || yesterday} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Live preview + balance */}
            {(bothDates || (selectedType !== null && balanceRow !== null)) && (
              <div className="space-y-2 rounded-lg border border-border/80 bg-muted/40 p-3">
                {bothDates && (
                  <p className="flex items-center gap-2 text-sm">
                    <CalendarRange className="size-4 text-primary" aria-hidden />
                    {previewDays > 0 ? (
                      <span className="font-medium">
                        {t("portal.leave.create.daysPreview", { n: formatNumber(previewDays, lang) })}
                      </span>
                    ) : (
                      <span className="font-medium text-warning">{t("portal.leave.create.weekendPreview")}</span>
                    )}
                  </p>
                )}
                {balanceRow && selectedType && (
                  <p
                    className={cn(
                      "text-sm tabular-nums",
                      overBalance ? "font-medium text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {t("portal.leave.create.balanceLine", {
                      type: selectedType.name,
                      n: formatNumber(balanceRow.remaining, lang),
                    })}
                    {balanceRow.pending > 0 && (
                      <span className="ml-2 text-xs">
                        ({t("portal.leave.balances.pendingNote", { n: formatNumber(balanceRow.pending, lang) })})
                      </span>
                    )}
                  </p>
                )}
                {overBalance && (
                  <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
                    {t("portal.leave.create.balanceWarn")}
                  </Badge>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("portal.leave.create.reasonLabel")}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({t("portal.common.optional")})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-20"
                      placeholder={t("portal.leave.create.reasonPh")}
                      maxLength={300}
                      {...field}
                    />
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
              <Button type="submit" className="h-10" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {t("portal.leave.create.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
