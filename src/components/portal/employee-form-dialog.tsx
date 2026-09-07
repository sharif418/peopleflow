"use client"

import { useMemo, useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useI18n, type TranslateFn } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { HR_ENDPOINTS } from "./api"
import { employmentTypeLabel, genderLabel, statusLabel } from "./labels"
import type { EmployeeRow, HrRow } from "./types"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

interface FormValues {
  firstName: string
  lastName: string
  employeeCode: string
  email: string
  phone: string
  gender: string
  dateOfJoining: string
  employmentType: "full_time" | "part_time" | "contract" | "intern"
  status: "active" | "probation" | "suspended" | "inactive"
  monthlySalary: string
  departmentId: string
  designationId: string
  branchId: string
  shiftId: string
}

function buildSchema(t: TranslateFn) {
  return z.object({
    firstName: z.string().trim().min(2, t("portal.employees.vFirstName")).max(60),
    lastName: z.string().trim().min(2, t("portal.employees.vLastName")).max(60),
    employeeCode: z.string().trim().max(30),
    email: z
      .string()
      .trim()
      .max(120)
      .refine((v) => !v || EMAIL_RE.test(v), t("portal.employees.vEmail")),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine((v) => !v || /^[\d+\-\s]{8,20}$/.test(v), t("portal.employees.vPhone")),
    gender: z.string(),
    dateOfJoining: z
      .string()
      .trim()
      .min(1, t("portal.employees.vDate"))
      .regex(DATE_RE, t("portal.employees.vDateInvalid")),
    employmentType: z.enum(["full_time", "part_time", "contract", "intern"]),
    status: z.enum(["active", "probation", "suspended", "inactive"]),
    monthlySalary: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (Number(v) >= 0 && Number(v) <= 10_000_000),
        t("portal.employees.vSalary"),
      ),
    departmentId: z.string(),
    designationId: z.string(),
    branchId: z.string(),
    shiftId: z.string(),
  })
}

const EMPTY: FormValues = {
  firstName: "",
  lastName: "",
  employeeCode: "",
  email: "",
  phone: "",
  gender: "",
  dateOfJoining: "",
  employmentType: "full_time",
  status: "active",
  monthlySalary: "",
  departmentId: "",
  designationId: "",
  branchId: "",
  shiftId: "",
}

function RelationSelect({
  value,
  onChange,
  placeholder,
  endpoint,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  endpoint: string
  disabled?: boolean
}) {
  const { t } = useI18n()
  const { data } = useQuery({
    queryKey: [endpoint],
    queryFn: () => apiFetch<HrRow[]>(endpoint),
    staleTime: 60_000,
  })
  const items = data ?? []

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-10 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">{t("portal.employees.noOptions")}</div>
        )}
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  suggestedCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: EmployeeRow | null
  suggestedCode: string
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const schema = useMemo(() => buildSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: employee
      ? {
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeCode: employee.employeeCode,
          email: employee.email ?? "",
          phone: employee.phone ?? "",
          gender: employee.gender ?? "",
          dateOfJoining: employee.dateOfJoining,
          employmentType: (employee.employmentType as FormValues["employmentType"]) ?? "full_time",
          status: (employee.status as FormValues["status"]) ?? "active",
          monthlySalary: employee.monthlySalary !== null ? String(employee.monthlySalary) : "",
          departmentId: employee.departmentId ?? "",
          designationId: employee.designationId ?? "",
          branchId: employee.branchId ?? "",
          shiftId: employee.shiftId ?? "",
        }
      : { ...EMPTY, employeeCode: suggestedCode },
  })

  // The parent conditionally mounts this dialog (keyed by employee id), so
  // defaultValues are always fresh — no reset-on-open effect is needed.

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: Record<string, unknown> = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        employeeCode: values.employeeCode.trim(),
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        gender: values.gender || null,
        dateOfJoining: values.dateOfJoining,
        employmentType: values.employmentType,
        status: values.status,
        monthlySalary: values.monthlySalary.trim() === "" ? null : Number(values.monthlySalary),
        departmentId: values.departmentId || null,
        designationId: values.designationId || null,
        branchId: values.branchId || null,
        shiftId: values.shiftId || null,
      }
      return employee
        ? apiFetch(`/api/org/employees/${employee.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : apiFetch("/api/org/employees", { method: "POST", body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      toast.success(employee ? t("portal.employees.successUpdated") : t("portal.employees.successCreated"))
      void queryClient.invalidateQueries({ queryKey: ["org", "employees"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "overview"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "departments"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "designations"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "branches"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "shifts"] })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      const code = err.message
      if (code === "code_taken") setSubmitError(t("portal.employees.errCodeTaken"))
      else if (code.startsWith("invalid_relation_")) {
        const field = code.replace("invalid_relation_", "")
        const label =
          field === "department"
            ? t("portal.common.department")
            : field === "designation"
              ? t("portal.common.designation")
              : field === "branch"
                ? t("portal.common.branch")
                : t("portal.common.shift")
        setSubmitError(t("portal.employees.errRelation", { field: label }))
      } else if (code === "validation_failed") setSubmitError(t("portal.common.operationFailed"))
      else setSubmitError(err.message)
    },
  })

  const onSubmit = (values: FormValues) => {
    setSubmitError(null)
    mutation.mutate(values)
  }

  const isEdit = employee !== null

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("portal.employees.formEditTitle") : t("portal.employees.formCreateTitle")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("portal.employees.formEditDesc", { name: `${employee.firstName} ${employee.lastName}` })
              : t("portal.employees.formCreateDesc")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.employees.firstName")}</FormLabel>
                    <FormControl>
                      <Input className="h-10" placeholder={t("portal.employees.firstNamePh")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.employees.lastName")}</FormLabel>
                    <FormControl>
                      <Input className="h-10" placeholder={t("portal.employees.lastNamePh")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="employeeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("portal.employees.employeeCode")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({t("portal.common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input className="h-10 font-mono" placeholder={suggestedCode} {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t("portal.employees.employeeCodeHint")}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("portal.common.phone")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({t("portal.common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input className="h-10" placeholder={t("portal.employees.phonePh")} inputMode="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("portal.common.email")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({t("portal.common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input className="h-10" placeholder={t("portal.employees.emailPh")} inputMode="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("portal.employees.gender")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({t("portal.common.optional")})
                      </span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder={t("portal.employees.selectGender")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">{genderLabel("male", t)}</SelectItem>
                        <SelectItem value="female">{genderLabel("female", t)}</SelectItem>
                        <SelectItem value="other">{genderLabel("other", t)}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfJoining"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.common.dateOfJoining")}</FormLabel>
                    <FormControl>
                      <Input className="h-10" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthlySalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("portal.employees.monthlySalary")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({t("portal.common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input className="h-10 tabular-nums" inputMode="numeric" placeholder="25000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.employees.employmentType")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder={t("portal.employees.selectType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["full_time", "part_time", "contract", "intern"] as const).map((v) => (
                          <SelectItem key={v} value={v}>
                            {employmentTypeLabel(v, t)}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("portal.common.status")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder={t("portal.employees.selectStatus")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["active", "probation", "suspended", "inactive"] as const).map((v) => (
                          <SelectItem key={v} value={v}>
                            {statusLabel(v, t)}
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
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("portal.common.department")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({t("portal.common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <RelationSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("portal.employees.selectDepartment")}
                        endpoint={HR_ENDPOINTS.departments}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("portal.common.designation")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({t("portal.common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <RelationSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("portal.employees.selectDesignation")}
                        endpoint={HR_ENDPOINTS.designations}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("portal.common.branch")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({t("portal.common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <RelationSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("portal.employees.selectBranch")}
                        endpoint={HR_ENDPOINTS.branches}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shiftId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("portal.common.shift")}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({t("portal.common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <RelationSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("portal.employees.selectShift")}
                        endpoint={HR_ENDPOINTS.shifts}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {submitError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
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
                {isEdit ? t("portal.employees.submitUpdate") : t("portal.employees.submitCreate")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
