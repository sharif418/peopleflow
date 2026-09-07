"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2, UserPlus, Users, X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatBdt, formatDate, formatNumber, initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { HR_ENDPOINTS, orgKeys } from "./api"
import { codeBadgeClass, statusBadgeClass, statusLabel } from "./labels"
import { EmployeeDetailDialog } from "./employee-detail-dialog"
import { EmployeeFormDialog } from "./employee-form-dialog"
import type { EmployeeRow, EmployeesPage, HrRow } from "./types"

const PAGE_SIZE = 12
const STATUS_OPTIONS = ["active", "probation", "suspended", "inactive"] as const

export function EmployeesView() {
  const { lang, t } = useI18n()
  const queryClient = useQueryClient()

  const [qInput, setQInput] = useState("")
  const q = useDeferredValue(qInput)
  const [departmentId, setDepartmentId] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)

  const [detailEmployee, setDetailEmployee] = useState<EmployeeRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeeRow | null>(null)
  const [deleting, setDeleting] = useState<EmployeeRow | null>(null)

  const filters = useMemo(
    () => ({ q, departmentId, status, page }),
    [q, departmentId, status, page],
  )

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: orgKeys.employees(filters),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (q) params.set("q", q)
      if (departmentId) params.set("departmentId", departmentId)
      if (status) params.set("status", status)
      return apiFetch<EmployeesPage>(`/api/org/employees?${params.toString()}`)
    },
    placeholderData: (prev) => prev,
  })

  const { data: departments } = useQuery({
    queryKey: orgKeys.hr("departments"),
    queryFn: () => apiFetch<HrRow[]>(HR_ENDPOINTS.departments),
    staleTime: 60_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/org/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("portal.employees.successDeleted"))
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ["org", "employees"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "overview"] })
      void queryClient.invalidateQueries({ queryKey: ["org", "departments"] })
    },
    onError: () => toast.error(t("portal.common.operationFailed")),
  })

  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
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
                setEditing(row.original)
                setFormOpen(true)
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
                setDeleting(row.original)
              }}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ),
      },
    ],
    [t, lang],
  )

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = q !== "" || departmentId !== "" || status !== ""

  const clearFilters = () => {
    setQInput("")
    setDepartmentId("")
    setStatus("")
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("portal.employees.title")}
        subtitle={t("portal.employees.subtitle")}
        icon={Users}
        actions={
          <Button
            className="h-10"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <UserPlus className="size-4" aria-hidden />
            {t("portal.employees.add")}
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={qInput}
            onChange={(e) => {
              setQInput(e.target.value)
              setPage(1)
            }}
            placeholder={t("portal.employees.searchPlaceholder")}
            className="h-10 pl-9"
            aria-label={t("portal.employees.searchPlaceholder")}
          />
          {qInput && (
            <button
              type="button"
              onClick={() => setQInput("")}
              aria-label={t("portal.common.close")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Select
            value={departmentId}
            onValueChange={(v) => {
              setDepartmentId(v ?? "")
              setPage(1)
            }}
          >
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
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v ?? "")
              setPage(1)
            }}
          >
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

      {/* Result summary */}
      <p className="text-sm text-muted-foreground">
        {data ? t("portal.employees.totalEmployees", { n: formatNumber(total, lang) }) : " "}
      </p>

      {/* Table */}
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title={t("common.error")}
          description={t("portal.common.errorDesc")}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : total === 0 ? (
        <EmptyState
          icon={Users}
          title={t("portal.employees.noResults")}
          description={t("portal.employees.noResultsDesc")}
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                {t("portal.employees.clearFilters")}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <UserPlus className="size-4" aria-hidden />
                {t("portal.employees.add")}
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "whitespace-nowrap text-xs font-semibold",
                          header.id === "actions" && "text-right",
                          (header.id === "department" || header.id === "designation") && "hidden md:table-cell",
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => setDetailEmployee(row.original)}
                    className="cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "py-2.5",
                          cell.column.id === "actions" && "text-right",
                          (cell.column.id === "department" || cell.column.id === "designation") &&
                            "hidden md:table-cell",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > 0 && data && (
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("portal.employees.showing")} {formatNumber((data.page - 1) * PAGE_SIZE + 1, lang)}–
            {formatNumber(Math.min(data.page * PAGE_SIZE, total), lang)} {t("portal.employees.of")}{" "}
            {formatNumber(total, lang)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t("portal.employees.prev")}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              {t("portal.employees.page")} {formatNumber(page, lang)}/{formatNumber(totalPages, lang)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t("portal.employees.next")}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <EmployeeDetailDialog
        employee={detailEmployee}
        open={detailEmployee !== null}
        onOpenChange={(o) => {
          if (!o) setDetailEmployee(null)
        }}
      />

      {formOpen && (
        <EmployeeFormDialog
          open
          onOpenChange={(o) => {
            if (!o) setFormOpen(false)
          }}
          employee={editing}
          suggestedCode={data?.nextCode ?? "PF-0001"}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null)
        }}
        title={t("portal.employees.deleteTitle")}
        description={t("portal.employees.deleteDesc", {
          name: deleting ? `${deleting.firstName} ${deleting.lastName}` : "",
          code: deleting?.employeeCode ?? "",
        })}
        confirmLabel={t("portal.common.delete")}
        cancelLabel={t("portal.common.cancel")}
        onConfirm={() => {
          if (deleting) void deleteMutation.mutateAsync(deleting.id)
        }}
      />
    </div>
  )
}
