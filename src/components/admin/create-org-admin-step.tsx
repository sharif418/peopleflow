"use client"

// Create-org wizard step 3 — admin account fields (name, email, password with
// show/hide toggle owned by the parent dialog).
import { Controller, type Control } from "react-hook-form"
import { Eye, EyeOff } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CreateForm } from "./create-org-schema"

export function CreateOrgAdminStep({
  control,
  showPassword,
  onTogglePassword,
}: {
  control: Control<CreateForm>
  showPassword: boolean
  onTogglePassword: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="co-admin-name">{t("admin.createOrg.adminName")}</Label>
        <Controller
          control={control}
          name="adminName"
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <Input
                id="co-admin-name"
                placeholder={t("admin.createOrg.adminNamePlaceholder")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={Boolean(fieldState.error)}
              />
              {fieldState.error && (
                <p className="text-xs text-destructive">{t("admin.createOrg.adminNameMin")}</p>
              )}
            </div>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="co-admin-email">{t("admin.createOrg.adminEmail")}</Label>
        <Controller
          control={control}
          name="adminEmail"
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <Input
                id="co-admin-email"
                type="email"
                inputMode="email"
                placeholder={t("admin.createOrg.adminEmailPlaceholder")}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                onBlur={field.onBlur}
                aria-invalid={Boolean(fieldState.error)}
              />
              {fieldState.error && (
                <p className="text-xs text-destructive">
                  {fieldState.error.type === "too_small"
                    ? t("admin.createOrg.adminEmailTaken")
                    : t("admin.createOrg.adminEmailInvalid")}
                </p>
              )}
            </div>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="co-admin-password">{t("admin.createOrg.adminPassword")}</Label>
        <Controller
          control={control}
          name="adminPassword"
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <div className="relative">
                <Input
                  id="co-admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("admin.createOrg.adminPasswordPlaceholder")}
                  className="pr-10"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-invalid={Boolean(fieldState.error)}
                />
                <button
                  type="button"
                  onClick={onTogglePassword}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? t("admin.createOrg.hidePassword") : t("admin.createOrg.showPassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              {fieldState.error && (
                <p className="text-xs text-destructive">{t("admin.createOrg.adminPasswordMin")}</p>
              )}
            </div>
          )}
        />
      </div>
    </div>
  )
}
