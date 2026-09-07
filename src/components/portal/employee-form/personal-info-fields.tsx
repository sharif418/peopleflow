"use client"

// Personal info fields — name row + employee code / phone / email row.
import type { Control } from "react-hook-form"
import { useI18n } from "@/lib/i18n"
import { Input } from "@/components/ui/input"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import type { FormValues } from "./schema"

export function PersonalInfoFields({ control, suggestedCode }: { control: Control<FormValues>; suggestedCode: string }) {
  const { t } = useI18n()

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("portal.employees.firstName")}</FormLabel>
              <FormControl>
                <Input className="h-10" placeholder={t("portal.employees.firstNamePh")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("portal.employees.lastName")}</FormLabel>
              <FormControl>
                <Input className="h-10" placeholder={t("portal.employees.lastNamePh")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={control}
          name="employeeCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("portal.employees.employeeCode")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("portal.common.optional")})
                </span>
              </FormLabel>
              <FormControl>
                <Input className="h-10 font-mono" placeholder={suggestedCode} {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">{t("portal.employees.employeeCodeHint")}</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("portal.common.phone")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("portal.common.optional")})
                </span>
              </FormLabel>
              <FormControl>
                <Input className="h-10" placeholder={t("portal.employees.phonePh")} inputMode="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("portal.common.email")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("portal.common.optional")})
                </span>
              </FormLabel>
              <FormControl>
                <Input className="h-10" placeholder={t("portal.employees.emailPh")} inputMode="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}
