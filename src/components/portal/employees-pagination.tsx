"use client"

// Employees pagination — "showing X–Y of Z" summary with prev / next buttons.
import type { Dispatch, SetStateAction } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatNumber } from "@/lib/format"
import { Button } from "@/components/ui/button"

export function EmployeesPagination({
  page,
  dataPage,
  total,
  totalPages,
  pageSize,
  setPage,
}: {
  page: number
  dataPage: number
  total: number
  totalPages: number
  pageSize: number
  setPage: Dispatch<SetStateAction<number>>
}) {
  const { lang, t } = useI18n()

  return (
    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p className="text-xs text-muted-foreground tabular-nums">
        {t("portal.employees.showing")} {formatNumber((dataPage - 1) * pageSize + 1, lang)}–
        {formatNumber(Math.min(dataPage * pageSize, total), lang)} {t("portal.employees.of")}{" "}
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
  )
}
