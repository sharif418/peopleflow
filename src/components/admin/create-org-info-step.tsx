"use client"

// Create-org wizard step 1 — org name (auto-slug syncs subdomain until edited),
// subdomain and site preview card.
import { Controller, type Control } from "react-hook-form"
import { Globe } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import type { CreateForm } from "./create-org-schema"

export function CreateOrgInfoStep({
  control,
  subdomain,
  onNameInput,
  onSubdomainInput,
}: {
  control: Control<CreateForm>
  subdomain: string
  onNameInput: (value: string) => void
  onSubdomainInput: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="co-name">{t("admin.createOrg.orgName")}</Label>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <Input
                id="co-name"
                placeholder={t("admin.createOrg.orgNamePlaceholder")}
                value={field.value}
                onChange={(e) => {
                  field.onChange(e)
                  onNameInput(e.target.value)
                }}
                onBlur={field.onBlur}
                aria-invalid={Boolean(fieldState.error)}
              />
              {fieldState.error && (
                <p className="text-xs text-destructive">{t("admin.createOrg.orgNameMin")}</p>
              )}
            </div>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="co-subdomain">{t("admin.createOrg.subdomain")}</Label>
        <Controller
          control={control}
          name="subdomain"
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <Input
                id="co-subdomain"
                placeholder={t("admin.createOrg.subdomainPlaceholder")}
                className="font-mono lowercase"
                value={field.value}
                onChange={(e) => {
                  onSubdomainInput()
                  field.onChange(e.target.value.toLowerCase())
                }}
                onBlur={field.onBlur}
                aria-invalid={Boolean(fieldState.error)}
              />
              <p className="text-xs text-muted-foreground">
                {fieldState.error ? (
                  <span className="text-destructive">{t("admin.createOrg.subdomainInvalid")}</span>
                ) : (
                  t("admin.createOrg.subdomainHint")
                )}
              </p>
            </div>
          )}
        />
      </div>

      <Card className="bg-muted/40">
        <div className="flex items-center gap-3 p-3">
          <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 text-sm">
            <p className="text-xs text-muted-foreground">{t("admin.createOrg.sitePreview")}</p>
            <p className="truncate font-mono text-[13px]">{subdomain || "…"}.peopleflow.com</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
