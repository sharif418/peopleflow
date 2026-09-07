"use client"

// Employees toolbar — search input with clear button, department and status
// selects. Filter state and reset-to-page-1 behavior live in the parent view.
import { Search, X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { statusLabel } from "./labels"
import type { HrRow } from "./types"

const STATUS_OPTIONS = ["active", "probation", "suspended", "inactive"] as const

export function EmployeesFilters({
  qInput,
  onQInputChange,
  onClearQ,
  departmentId,
  onDepartmentChange,
  status,
  onStatusChange,
  departments,
}: {
  qInput: string
  onQInputChange: (value: string) => void
  onClearQ: () => void
  departmentId: string
  onDepartmentChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  departments: HrRow[] | undefined
}) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={qInput}
          onChange={(e) => onQInputChange(e.target.value)}
          placeholder={t("portal.employees.searchPlaceholder")}
          className="h-10 pl-9"
          aria-label={t("portal.employees.searchPlaceholder")}
        />
        {qInput && (
          <button
            type="button"
            onClick={onClearQ}
            aria-label={t("portal.common.close")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <Select value={departmentId} onValueChange={onDepartmentChange}>
          <SelectTrigger className="h-10 min-w-40 flex-1 sm:w-48" aria-label={t("portal.common.department")}>
            <SelectValue placeholder={t("portal.employees.allDepartments")} />
          </SelectTrigger>
          <SelectContent>
            {(departments ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-10 min-w-36 flex-1 sm:w-44" aria-label={t("portal.common.status")}>
            <SelectValue placeholder={t("portal.employees.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
