"use client"

// Organizations section — toolbar (search + status filter) + TanStack table + create dialog
import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { Building2, Eye, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { useAdminUiStore } from "@/store/admin-ui"
import { apiFetch } from "@/lib/fetcher"
import { useI18n } from "@/lib/i18n"
import { formatBdt, formatDate, formatNumber } from "@/lib/format"
import { OrgStatusBadge, PlanBadge } from "./badges"
import { CreateOrgDialog } from "./create-org-dialog"
import type { OrgRow } from "./types"

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const STATUS_VALUES = ["", "active", "suspended", "provisioning"] as const

export function OrgsView() {
  const openOrg = useAdminUiStore((s) => s.openOrg)
  const { t, lang } = useI18n()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<(typeof STATUS_VALUES)[number]>("")
  const debouncedSearch = useDebounced(search, 300)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "orgs", debouncedSearch, status],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("q", debouncedSearch)
      if (status) params.set("status", status)
      const qs = params.toString()
      return apiFetch<OrgRow[]>(`/api/admin/organizations${qs ? `?${qs}` : ""}`)
    },
  })

  const columnHelper = createColumnHelper<OrgRow>()
  const columns = useMemo<ColumnDef<OrgRow, unknown>[]>(
    () => [
      columnHelper.display({
        id: "org",
        header: () => t("admin.orgs.colOrg"),
        cell: ({ row }) => (
          <div className="max-w-56 min-w-40 sm:min-w-52">
            <p className="truncate font-medium" title={row.original.name}>
              {row.original.name}
            </p>
            <p className="truncate font-mono text-xs text-muted-foreground">{row.original.subdomain}</p>
          </div>
        ),
      }),
      columnHelper.display({
        id: "plan",
        header: () => t("admin.orgs.colPlan"),
        cell: ({ row }) => <PlanBadge planKey={row.original.planKey} />,
      }),
      columnHelper.display({
        id: "employees",
        header: () => t("admin.orgs.colEmployees"),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatNumber(row.original.employeesCount, lang)}</span>
        ),
      }),
      columnHelper.display({
        id: "mrr",
        header: () => t("admin.orgs.colMrr"),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{formatBdt(row.original.mrr, lang)}</span>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: () => t("admin.orgs.colStatus"),
        cell: ({ row }) => <OrgStatusBadge status={row.original.status} />,
      }),
      columnHelper.display({
        id: "created",
        header: () => t("admin.orgs.colCreated"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDate(row.original.createdAt, lang)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">{t("admin.orgs.colActions")}</span>,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2"
            onClick={() => openOrg(row.original.id)}
            aria-label={`${t("admin.orgs.viewOrg")} ${row.original.name}`}
          >
            <Eye className="h-4 w-4" aria-hidden />
            <span className="hidden md:inline">{t("admin.orgs.viewOrg")}</span>
          </Button>
        ),
      }),
    ],
    [t, lang, columnHelper, openOrg],
  )

  // TanStack Table instance is required by spec — its function-returning API is
  // known to the React Compiler linter and safe here (we only read row models).
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("admin.orgs.title")}
        subtitle={t("admin.orgs.subtitle")}
        icon={Building2}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden />
            {t("admin.orgs.newOrg")}
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.orgs.searchPlaceholder")}
            className="pl-9"
            aria-label={t("admin.orgs.searchPlaceholder")}
          />
        </div>
        <Select
          value={status || "all"}
          onValueChange={(v) => setStatus(v === "all" ? "" : (v as (typeof STATUS_VALUES)[number]))}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label={t("admin.orgs.filterStatus")}>
            <SelectValue placeholder={t("admin.orgs.filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.orgs.allStatuses")}</SelectItem>
            <SelectItem value="active">{t("admin.orgs.active")}</SelectItem>
            <SelectItem value="suspended">{t("admin.orgs.suspended")}</SelectItem>
            <SelectItem value="provisioning">{t("admin.orgs.provisioning")}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs tabular-nums text-muted-foreground sm:ml-auto">
          {data ? t("admin.orgs.count", { count: formatNumber(data.length, lang) }) : ""}
        </p>
      </div>

      {/* Table */}
      <Card className="border-border/80 py-0 shadow-xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-44 flex-1" />
                  <Skeleton className="hidden h-6 w-16 sm:block" />
                  <Skeleton className="hidden h-6 w-16 md:block" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-6">
              <EmptyState
                title={t("admin.common.errorTitle")}
                description={t("admin.common.errorDesc")}
                action={
                  <Button variant="outline" onClick={() => void refetch()}>
                    {t("admin.common.retry")}
                  </Button>
                }
              />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Building2}
                title={t("admin.orgs.emptyTitle")}
                description={t("admin.orgs.emptyDesc")}
                action={
                  <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" aria-hidden />
                    {t("admin.orgs.newOrg")}
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto pf-scrollbar">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="whitespace-nowrap">
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
                      className="cursor-pointer"
                      onClick={() => openOrg(row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(orgId) => openOrg(orgId)}
      />
    </div>
  )
}
