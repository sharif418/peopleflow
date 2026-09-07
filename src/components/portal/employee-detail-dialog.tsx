"use client"

import { Mail, Phone } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt, formatDate, initialsOf } from "@/lib/format"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { statusBadgeClass, statusLabel, employmentTypeLabel, genderLabel } from "./labels"
import type { EmployeeRow } from "./types"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{value ?? "-"}</dd>
    </div>
  )
}

export function EmployeeDetailDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: EmployeeRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { lang, t } = useI18n()
  if (!employee) return null

  const name = `${employee.firstName} ${employee.lastName}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="size-12 shrink-0">
              <AvatarFallback className="bg-primary/15 text-base font-semibold text-primary">
                {initialsOf(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate">{name}</p>
              <p className="font-mono text-xs font-normal text-muted-foreground">{employee.employeeCode}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">{t("portal.employees.detailTitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={statusBadgeClass(employee.status)}>
              {statusLabel(employee.status, t)}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {employmentTypeLabel(employee.employmentType, t)}
            </Badge>
            {employee.gender && (
              <Badge variant="outline" className="font-normal">
                {genderLabel(employee.gender, t)}
              </Badge>
            )}
          </div>

          <section aria-label={t("portal.employees.contactInfo")}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("portal.employees.contactInfo")}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2">
                <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate text-sm tabular-nums">
                  {employee.phone ?? t("portal.common.notSet")}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate text-sm">
                  {employee.email ?? t("portal.common.notSet")}
                </span>
              </div>
            </div>
          </section>

          <Separator />

          <section aria-label={t("portal.employees.employmentInfo")}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("portal.employees.employmentInfo")}
            </h4>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label={t("portal.common.department")} value={employee.department?.name} />
              <Field label={t("portal.common.designation")} value={employee.designation?.name} />
              <Field label={t("portal.common.branch")} value={employee.branch?.name} />
              <Field label={t("portal.common.shift")} value={employee.shift?.name} />
              <Field
                label={t("portal.common.dateOfJoining")}
                value={formatDate(employee.dateOfJoining, lang)}
              />
              <Field
                label={t("portal.common.salary")}
                value={
                  employee.monthlySalary !== null ? (
                    <span className="tabular-nums">{formatBdt(employee.monthlySalary, lang)}</span>
                  ) : (
                    t("portal.common.notSet")
                  )
                }
              />
            </dl>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
