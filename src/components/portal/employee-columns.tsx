"use client"

// Employees table column definitions — code, name+avatar, department,
// designation, status, salary, joining date and row actions.
import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt, formatDate, initialsOf } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { codeBadgeClass, statusBadgeClass, statusLabel } from "./labels"
import type { EmployeeRow } from "./types"

export function useEmployeeColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (employee: EmployeeRow) => void
  onDelete: (employee: EmployeeRow) => void
}): ColumnDef<EmployeeRow>[] {
  const { lang, t } = useI18n()

  return useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
      {
        accessorKey: "employeeCode",
        header: t("portal.common.code"),
        cell: ({ row }) => (
          <Badge variant="outline" className={codeBadgeClass()}>
            {row.original.employeeCode}
          </Badge>
        ),
      },
      {
        id: "name",
        header: t("portal.employees.employeeName"),
        cell: ({ row }) => {
          const e = row.original
          const name = `${e.firstName} ${e.lastName}`
          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
                  {initialsOf(name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="max-w-44 truncate text-sm font-medium">{name}</p>
                <p className="truncate text-xs text-muted-foreground sm:hidden">{e.designation?.name ?? "—"}</p>
              </div>
            </div>
          )
        },
      },
      {
        id: "department",
        header: t("portal.common.department"),
        cell: ({ row }) => (
          <span className="hidden max-w-32 truncate text-sm text-muted-foreground md:inline">
            {row.original.department?.name ?? t("portal.common.notSet")}
          </span>
        ),
      },
      {
        id: "designation",
        header: t("portal.common.designation"),
        cell: ({ row }) => (
          <span className="hidden max-w-32 truncate text-sm text-muted-foreground md:inline">
            {row.original.designation?.name ?? t("portal.common.notSet")}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("portal.common.status"),
        cell: ({ row }) => (
          <Badge variant="secondary" className={statusBadgeClass(row.original.status)}>
            {statusLabel(row.original.status, t)}
          </Badge>
        ),
      },
      {
        accessorKey: "monthlySalary",
        header: t("portal.common.salary"),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.monthlySalary !== null ? formatBdt(row.original.monthlySalary, lang) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "dateOfJoining",
        header: t("portal.employees.joining"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">
            {formatDate(row.original.dateOfJoining, lang)}
          </span>
        ),
      },
      {
        id: "actions",
        header: t("portal.common.actions"),
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label={t("portal.common.edit")}
              title={t("portal.common.edit")}
              onClick={(e) => {
                e.stopPropagation()
                onEdit(row.original)
              }}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("portal.common.delete")}
              title={t("portal.common.delete")}
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row.original)
              }}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ),
      },
    ],
    [t, lang, onEdit, onDelete],
  )
}
