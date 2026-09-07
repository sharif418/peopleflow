"use client"

// Audit Logs section — search + org filter + paginated table
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react"
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
import { apiFetch } from "@/lib/fetcher"
import { useI18n } from "@/lib/i18n"
import { formatDateTime, formatNumber } from "@/lib/format"
import { ActionBadge } from "./badges"
import { ACTION_ICONS, actionLabel } from "./action-utils"
import type { AuditPageResponse } from "./types"

const PAGE_SIZE = 20

export function AuditView() {
  const { t, lang } = useI18n()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [orgFilter, setOrgFilter] = useState("all")

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin", "audit", page, search, orgFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (search) params.set("q", search)
      if (orgFilter !== "all") params.set("organizationId", orgFilter)
      return apiFetch<AuditPageResponse>(`/api/admin/audit-logs?${params.toString()}`)
    },
    placeholderData: (prev) => prev,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const from = data && data.items.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const to = data ? from + data.items.length - 1 : 0

  const orgs = data?.organizations ?? []

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("admin.audit.title")}
        subtitle={t("admin.audit.subtitle")}
        icon={ScrollText}
      />

      {/* Filters */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
            placeholder={t("admin.audit.searchPlaceholder")}
            className="pl-9"
            aria-label={t("admin.audit.searchPlaceholder")}
          />
        </div>
        <Select
          value={orgFilter}
          onValueChange={(v) => {
            setPage(1)
            setOrgFilter(v)
          }}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label={t("admin.audit.filterOrg")}>
            <SelectValue placeholder={t("admin.audit.filterOrg")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.audit.allOrgs")}</SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/80 py-0 shadow-xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40 flex-1" />
                  <Skeleton className="hidden h-4 w-32 sm:block" />
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
          ) : !data || data.items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={ScrollText} title={t("admin.audit.emptyTitle")} description={t("admin.audit.emptyDesc")} />
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto pf-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="pl-6">{t("admin.audit.colTime")}</TableHead>
                    <TableHead>{t("admin.audit.colActor")}</TableHead>
                    <TableHead>{t("admin.audit.colAction")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("admin.audit.colDetails")}</TableHead>
                    <TableHead className="hidden pr-6 sm:table-cell">{t("admin.audit.colOrg")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((log) => {
                    const Icon = ACTION_ICONS[log.action] ?? ScrollText
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap pl-6 text-xs tabular-nums text-muted-foreground">
                          {formatDateTime(log.createdAt, lang)}
                        </TableCell>
                        <TableCell className="max-w-40 truncate font-medium" title={log.actor}>
                          {log.actor}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            <ActionBadge action={log.action} label={actionLabel(t, log.action)} />
                          </span>
                        </TableCell>
                        <TableCell className="hidden max-w-56 truncate text-sm text-muted-foreground md:table-cell" title={log.details ?? undefined}>
                          {log.details ?? "—"}
                        </TableCell>
                        <TableCell className="hidden max-w-36 truncate pr-6 text-sm text-muted-foreground sm:table-cell" title={log.organizationName ?? undefined}>
                          {log.organizationName ?? t("admin.audit.noOrg")}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs tabular-nums text-muted-foreground">
          {t("admin.audit.showing", {
            from: formatNumber(from, lang),
            to: formatNumber(to, lang),
            total: formatNumber(data?.total ?? 0, lang),
          })}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1 px-2.5"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t("admin.audit.prev")}</span>
          </Button>
          <span className="px-1 text-xs font-medium tabular-nums text-muted-foreground">
            {t("admin.audit.page", { page: formatNumber(page, lang) })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1 px-2.5"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            <span className="hidden sm:inline">{t("admin.audit.next")}</span>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
