"use client"

// Job details fields — gender / joining date / monthly salary row plus
// employment type and status row.
import type { Control } from "react-hook-form"
import { useI18n } from "@/lib/i18n"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { employmentTypeLabel, genderLabel, statusLabel } from "../labels"
import type { FormValues } from "./schema"

export function JobDetailsFields({ control }: { control: Control<FormValues> }) {
  const { t } = useI18n()

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("portal.employees.gender")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("portal.common.optional")})
                </span>
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder={t("portal.employees.selectGender")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">{genderLabel("male", t)}</SelectItem>
                  <SelectItem value="female">{genderLabel("female", t)}</SelectItem>
                  <SelectItem value="other">{genderLabel("other", t)}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="dateOfJoining"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("portal.common.dateOfJoining")}</FormLabel>
              <FormControl>
                <Input className="h-10" type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="monthlySalary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("portal.employees.monthlySalary")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("portal.common.optional")})
                </span>
              </FormLabel>
              <FormControl>
                <Input className="h-10 tabular-nums" inputMode="numeric" placeholder="25000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="employmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("portal.employees.employmentType")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder={t("portal.employees.selectType")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(["full_time", "part_time", "contract", "intern"] as const).map((v) => (
                    <SelectItem key={v} value={v}>
                      {employmentTypeLabel(v, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("portal.common.status")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder={t("portal.employees.selectStatus")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(["active", "probation", "suspended", "inactive"] as const).map((v) => (
                    <SelectItem key={v} value={v}>
                      {statusLabel(v, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}
