"use client"

// Claims filter row — status select + category select + search input.
// "__all" sentinel keeps Radix Select values non-empty while mapping to "".
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
import { CLAIM_STATUS_FILTERS, EXPENSE_CATEGORIES } from "./types"
import { categoryLabel, categoryMeta } from "./utils"

const ALL = "__all"

export function ClaimsFilters({
  status,
  onStatus,
  category,
  onCategory,
  q,
  onQ,
}: {
  status: string
  onStatus: (value: string) => void
  category: string
  onCategory: (value: string) => void
  q: string
  onQ: (value: string) => void
}) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select value={status || ALL} onValueChange={(v) => onStatus(v === ALL ? "" : v)}>
          <SelectTrigger aria-label={t("portal.expense.filter.statusLabel")} className="h-10 w-full sm:w-40">
            <SelectValue placeholder={t("portal.expense.filter.statusLabel")} />
          </SelectTrigger>
          <SelectContent>
            {CLAIM_STATUS_FILTERS.map((opt) => (
              <SelectItem key={opt.value || "all"} value={opt.value || ALL} className="min-h-10">
                {t(`portal.expense.${opt.label}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category || ALL} onValueChange={(v) => onCategory(v === ALL ? "" : v)}>
          <SelectTrigger aria-label={t("portal.expense.filter.categoryLabel")} className="h-10 w-full sm:w-48">
            <SelectValue placeholder={t("portal.expense.filter.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} className="min-h-10">
              {t("portal.expense.filter.allCategories")}
            </SelectItem>
            {EXPENSE_CATEGORIES.map((cat) => {
              const CatIcon = categoryMeta(cat).icon
              return (
                <SelectItem key={cat} value={cat} className="min-h-10">
                  <span className="flex items-center gap-2">
                    <CatIcon className="size-4" aria-hidden />
                    {categoryLabel(cat, t)}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder={t("portal.expense.claims.searchPlaceholder")}
          className="h-10 pl-9"
          aria-label={t("portal.expense.claims.searchPlaceholder")}
        />
        {q && (
          <button
            type="button"
            onClick={() => onQ("")}
            aria-label={t("portal.common.close")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}
