"use client"

// Org profile card — locked identity fields + editable address / phone / email.
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Building2, Lock } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SaveFooter } from "./save-footer"
import { useSettingsSave } from "./use-settings-save"
import type { OrgSettingsData } from "../payroll/types"

export function ProfileCard({ initial }: { initial: OrgSettingsData }) {
  const { t } = useI18n()
  const [address, setAddress] = useState(initial.address ?? "")
  const [phone, setPhone] = useState(initial.contactPhone ?? "")
  const [email, setEmail] = useState(initial.contactEmail ?? "")
  const saveMutation = useSettingsSave(t)

  const dirty = useMemo(
    () =>
      address !== (initial.address ?? "") ||
      phone !== (initial.contactPhone ?? "") ||
      email !== (initial.contactEmail ?? ""),
    [initial, address, phone, email],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="lg:col-span-2"
    >
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-primary" aria-hidden />
            {t("portal.settings.profileTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("portal.settings.profileDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-muted-foreground">
                <Lock className="size-3" aria-hidden />
                {t("portal.settings.orgNameLabel")}
              </Label>
              <Input value={initial.name} readOnly disabled className="h-10 bg-muted/40" />
              <p className="text-[11px] text-muted-foreground/70">{t("portal.settings.lockedHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-muted-foreground">
                <Lock className="size-3" aria-hidden />
                {t("portal.settings.subdomainLabel")}
              </Label>
              <Input
                value={`${initial.subdomain}.peopleflow.com`}
                readOnly
                disabled
                className="h-10 bg-muted/40 font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground/70">{t("portal.settings.lockedHint")}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="org-address">{t("portal.settings.addressLabel")}</Label>
            <textarea
              id="org-address"
              value={address}
              rows={2}
              maxLength={200}
              placeholder={t("portal.settings.addressPlaceholder")}
              onChange={(e) => setAddress(e.target.value)}
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-phone">{t("portal.settings.phoneLabel")}</Label>
              <Input
                id="org-phone"
                value={phone}
                maxLength={20}
                placeholder={t("portal.settings.phonePlaceholder")}
                className="h-10"
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-email">{t("portal.settings.emailLabel")}</Label>
              <Input
                id="org-email"
                type="email"
                value={email}
                maxLength={120}
                placeholder={t("portal.settings.emailPlaceholder")}
                className="h-10"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <SaveFooter
            dirty={dirty}
            saving={saveMutation.isPending}
            t={t}
            onSave={() =>
              saveMutation.mutate({
                address: address.trim() || null,
                contactPhone: phone.trim() || null,
                contactEmail: email.trim() || null,
              })
            }
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}
