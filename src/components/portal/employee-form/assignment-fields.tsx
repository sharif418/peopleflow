"use client"

// Assignment fields — department / designation / branch / shift relation
// selects (all optional).
import type { Control } from "react-hook-form"
import { useI18n } from "@/lib/i18n"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { HR_ENDPOINTS } from "../api"
import { RelationSelect } from "./relation-select"
import type { FormValues } from "./schema"

export function AssignmentFields({ control }: { control: Control<FormValues> }) {
  const { t } = useI18n()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="departmentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("portal.common.department")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("portal.common.optional")})
              </span>
            </FormLabel>
            <FormControl>
              <RelationSelect
                value={field.value}
                onChange={field.onChange}
                placeholder={t("portal.employees.selectDepartment")}
                endpoint={HR_ENDPOINTS.departments}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="designationId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("portal.common.designation")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("portal.common.optional")})
              </span>
            </FormLabel>
            <FormControl>
              <RelationSelect
                value={field.value}
                onChange={field.onChange}
                placeholder={t("portal.employees.selectDesignation")}
                endpoint={HR_ENDPOINTS.designations}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="branchId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("portal.common.branch")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("portal.common.optional")})
              </span>
            </FormLabel>
            <FormControl>
              <RelationSelect
                value={field.value}
                onChange={field.onChange}
                placeholder={t("portal.employees.selectBranch")}
                endpoint={HR_ENDPOINTS.branches}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="shiftId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("portal.common.shift")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("portal.common.optional")})
              </span>
            </FormLabel>
            <FormControl>
              <RelationSelect
                value={field.value}
                onChange={field.onChange}
                placeholder={t("portal.employees.selectShift")}
                endpoint={HR_ENDPOINTS.shifts}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
