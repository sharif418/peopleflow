"use client"

// Employee create/edit dialog — RHF + zod form shell; field groups live in
// ./employee-form/* (personal info, job details, assignments).
import { useMemo, useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Form } from "@/components/ui/form"
import { PersonalInfoFields } from "./employee-form/personal-info-fields"
import { JobDetailsFields } from "./employee-form/job-details-fields"
import { AssignmentFields } from "./employee-form/assignment-fields"
import { buildSchema, EMPTY, type FormValues } from "./employee-form/schema"
import type { EmployeeRow } from "./types"

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
            <PersonalInfoFields control={form.control} suggestedCode={suggestedCode} />

            <JobDetailsFields control={form.control} />

            <AssignmentFields control={form.control} />

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
