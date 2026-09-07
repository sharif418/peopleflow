"use client"

// Wizard step 4 — optional quick-add employee rows (name / phone / department).
import type { Dispatch, SetStateAction } from "react"
import { Plus, X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { EmpRow } from "../types"

export function EmployeesStep({
  employees,
  setEmployees,
  departments,
}: {
  employees: EmpRow[]
  setEmployees: Dispatch<SetStateAction<EmpRow[]>>
  departments: string[]
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{t("portal.wizard.step5Title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("portal.wizard.step5Desc")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">
          {t("portal.common.optional")} — {t("portal.wizard.step5Hint")}
        </p>
      </div>
      <div className="space-y-3">
        {employees.map((emp, idx) => (
          <div
            key={idx}
            className="grid gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor={`emp-first-${idx}`} className="text-xs text-muted-foreground">
                {t("portal.wizard.empFirstName")}
              </Label>
              <Input
                id={`emp-first-${idx}`}
                className="h-10"
                placeholder={t("portal.employees.firstNamePh")}
                value={emp.firstName}
                onChange={(e) =>
                  setEmployees((rows) => rows.map((r, i) => (i === idx ? { ...r, firstName: e.target.value } : r)))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`emp-last-${idx}`} className="text-xs text-muted-foreground">
                {t("portal.wizard.empLastName")}
              </Label>
              <Input
                id={`emp-last-${idx}`}
                className="h-10"
                placeholder={t("portal.employees.lastNamePh")}
                value={emp.lastName}
                onChange={(e) =>
                  setEmployees((rows) => rows.map((r, i) => (i === idx ? { ...r, lastName: e.target.value } : r)))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`emp-phone-${idx}`} className="text-xs text-muted-foreground">
                {t("portal.wizard.empPhone")}
              </Label>
              <Input
                id={`emp-phone-${idx}`}
                className="h-10"
                inputMode="tel"
                placeholder={t("portal.employees.phonePh")}
                value={emp.phone}
                onChange={(e) =>
                  setEmployees((rows) => rows.map((r, i) => (i === idx ? { ...r, phone: e.target.value } : r)))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("portal.wizard.empDept")}</Label>
              <Select
                value={emp.departmentName}
                onValueChange={(v) =>
                  setEmployees((rows) => rows.map((r, i) => (i === idx ? { ...r, departmentName: v } : r)))
                }
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder={t("portal.employees.selectDepartment")} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                disabled={employees.length <= 1}
                onClick={() => setEmployees((rows) => rows.filter((_, i) => i !== idx))}
              >
                <X className="size-4" aria-hidden />
                {t("portal.wizard.remove")}
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full border-dashed"
          onClick={() =>
            setEmployees((rows) => [...rows, { firstName: "", lastName: "", phone: "", departmentName: "" }])
          }
        >
          <Plus className="size-4" aria-hidden />
          {t("portal.wizard.addRow")}
        </Button>
      </div>
    </div>
  )
}
