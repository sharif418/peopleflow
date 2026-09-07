"use client"

// Salary structures tab — header with "new structure" action plus the
// structure card grid with skeleton / error / empty states.
import type { UseQueryResult } from "@tanstack/react-query"
import { Layers, Plus } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { StructureCard } from "./structure-card"
import type { SalaryStructureRow } from "./types"

export function StructuresTab({
  structuresQuery,
  onNew,
  onEdit,
  onDelete,
}: {
  structuresQuery: UseQueryResult<SalaryStructureRow[], Error>
  onNew: () => void
  onEdit: (structure: SalaryStructureRow) => void
  onDelete: (structure: SalaryStructureRow) => void
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("portal.payroll.structuresTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("portal.payroll.structuresSubtitle")}</p>
        </div>
        <Button className="h-10" onClick={onNew}>
          <Plus className="size-4" aria-hidden />
          {t("portal.payroll.newStructure")}
        </Button>
      </div>

      {structuresQuery.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : structuresQuery.isError || !structuresQuery.data ? (
        <EmptyState
          icon={Layers}
          title={t("portal.payroll.loadFailed")}
          action={
            <Button variant="outline" onClick={() => void structuresQuery.refetch()}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : structuresQuery.data.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t("portal.payroll.noStructures")}
          description={t("portal.payroll.noStructuresDesc")}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {structuresQuery.data.map((s) => (
            <StructureCard key={s.id} structure={s} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
