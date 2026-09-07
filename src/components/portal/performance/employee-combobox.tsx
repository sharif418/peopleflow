"use client"

// Shared searchable employee combobox (used by the goal + appraisal dialogs).
// Label keys are passed per-dialog (goalCreate / appraisalCreate namespaces).
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { initialsOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { EmployeesPage } from "../types"

export function useEmployeeOptions(enabled: boolean) {
  return useQuery({
    queryKey: ["org", "performance", "employee-options"],
    queryFn: () => apiFetch<EmployeesPage>("/api/org/employees?pageSize=100&status=active"),
    enabled,
    staleTime: 60_000,
  })
}

export function EmployeeCombobox({
  value,
  onChange,
  enabled,
  labelKey,
}: {
  value: string
  onChange: (employeeId: string) => void
  enabled: boolean
  labelKey: string
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const employeesQuery = useEmployeeOptions(enabled)
  const employees = employeesQuery.data?.items ?? []
  const selected = employees.find((e) => e.id === value) ?? null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="size-6">
                <AvatarFallback className="bg-primary/12 text-[9px] font-semibold text-primary">
                  {initialsOf(`${selected.firstName} ${selected.lastName}`)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {selected.firstName} {selected.lastName}{" "}
                <span className="font-mono text-xs text-muted-foreground">{selected.employeeCode}</span>
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{t(`${labelKey}.selectEmployee`)}</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(28rem,var(--radix-popover-trigger-width))] p-0" align="start">
        <Command>
          <CommandInput placeholder={t(`${labelKey}.searchEmployee`)} />
          <CommandList className="max-h-72 overflow-y-auto pf-scrollbar">
            <CommandEmpty>{t(`${labelKey}.noEmployee`)}</CommandEmpty>
            <CommandGroup>
              {employees.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={`${emp.firstName} ${emp.lastName} ${emp.employeeCode}`}
                  onSelect={() => {
                    onChange(emp.id)
                    setOpen(false)
                  }}
                  className="min-h-10"
                >
                  <Check
                    className={cn("mr-1 size-4", value === emp.id ? "opacity-100" : "opacity-0")}
                    aria-hidden
                  />
                  <span className="truncate">
                    {emp.firstName} {emp.lastName}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {emp.employeeCode}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
