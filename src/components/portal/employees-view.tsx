"use client"

// Employees view shell — filters, TanStack table, pagination and the employee
// detail / form / delete dialogs. Filters, columns, table and pagination live
// in co-located employees-* / employee-columns files.
import { useCallback, useDeferredValue, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { UserPlus, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmployeesFilters } from "./employees-filters"
import { EmployeesTable } from "./employees-table"
import { EmployeesPagination } from "./employees-pagination"
import { useEmployeeColumns } from "./employee-columns"
import { HR_ENDPOINTS, orgKeys } from "./api"
import { EmployeeDetailDialog } from "./employee-detail-dialog"
import { EmployeeFormDialog } from "./employee-form-dialog"
import type { EmployeeRow, EmployeesPage, HrRow } from "./types"

const PAGE_SIZE = 12

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

  const openForm = useCallback((employee: EmployeeRow | null) => {
    setEditing(employee)
    setFormOpen(true)
  }, [])
  const askDelete = useCallback((employee: EmployeeRow) => {
    setDeleting(employee)
  }, [])

  const columns = useEmployeeColumns({ onEdit: openForm, onDelete: askDelete })

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
          <Button className="h-10" onClick={() => openForm(null)}>
            <UserPlus className="size-4" aria-hidden />
            {t("portal.employees.add")}
          </Button>
        }
      />

      {/* Toolbar */}
      <EmployeesFilters
        qInput={qInput}
        onQInputChange={(value) => {
          setQInput(value)
          setPage(1)
        }}
        onClearQ={() => setQInput("")}
        departmentId={departmentId}
        onDepartmentChange={(v) => {
          setDepartmentId(v ?? "")
          setPage(1)
        }}
        status={status}
        onStatusChange={(v) => {
          setStatus(v ?? "")
          setPage(1)
        }}
        departments={departments}
      />

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
              <Button onClick={() => openForm(null)}>
                <UserPlus className="size-4" aria-hidden />
                {t("portal.employees.add")}
              </Button>
            )
          }
        />
      ) : (
        <EmployeesTable
          data={data?.items ?? []}
          columns={columns}
          onRowClick={setDetailEmployee}
        />
      )}

      {/* Pagination */}
      {total > 0 && data && (
        <EmployeesPagination
          page={page}
          dataPage={data.page}
          total={total}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          setPage={setPage}
        />
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
