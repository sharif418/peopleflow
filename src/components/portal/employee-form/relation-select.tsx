"use client"

// Relation select — department / designation / branch / shift dropdown fed by
// the shared HR list endpoints.
import { useQuery } from "@tanstack/react-query"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { HrRow } from "../types"

export function RelationSelect({
  value,
  onChange,
  placeholder,
  endpoint,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  endpoint: string
  disabled?: boolean
}) {
  const { t } = useI18n()
  const { data } = useQuery({
    queryKey: [endpoint],
    queryFn: () => apiFetch<HrRow[]>(endpoint),
    staleTime: 60_000,
  })
  const items = data ?? []

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-10 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">{t("portal.employees.noOptions")}</div>
        )}
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
