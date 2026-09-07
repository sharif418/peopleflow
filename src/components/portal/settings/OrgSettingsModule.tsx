"use client"

// Org settings module — profile (read-only identity + editable contact),
// workweek weekends, payroll PF config, and org info card. Default export.
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Globe,
  Info,
  Loader2,
  Lock,
  PiggyBank,
  Save,
  Settings,
} from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { PLANS } from "@/lib/features"
import { formatDate, formatNumber, toBnDigits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import type { OrgSettingsData } from "../payroll/types"

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const

function dayLabel(key: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    sunday: t("portal.settings.daySunday"),
    monday: t("portal.settings.dayMonday"),
    tuesday: t("portal.settings.dayTuesday"),
    wednesday: t("portal.settings.dayWednesday"),
    thursday: t("portal.settings.dayThursday"),
    friday: t("portal.settings.dayFriday"),
    saturday: t("portal.settings.daySaturday"),
  }
  return map[key] ?? key
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-sm font-medium">{value}</span>
    </div>
  )
}

export default function OrgSettingsModule() {
  const { lang, t } = useI18n()

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["org", "settings"],
    queryFn: () => apiFetch<OrgSettingsData>("/api/org/settings"),
  })

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={Settings}
        title={t("portal.settings.loadFailed")}
        action={
          <Button variant="outline" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        }
      />
    )
  }

  const planDef = PLANS.find((p) => p.key === data.planKey)
  const planName = planDef ? (lang === "bn" ? planDef.nameBn : planDef.nameEn) : data.planKey

  return (
    <div className="space-y-6">
      <PageHeader title={t("portal.settings.title")} subtitle={t("portal.settings.subtitle")} icon={Settings} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProfileCard initial={data} />
        <WorkweekCard initial={data} />
        <PayrollConfigCard initial={data} />
        <InfoCard data={data} planName={planName} lang={lang} t={t} />
      </div>
    </div>
  )
}

function SaveFooter({
  dirty,
  saving,
  onSave,
  t,
}: {
  dirty: boolean
  saving: boolean
  onSave: () => void
  t: (k: string) => string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
      <p className="text-[11px] text-muted-foreground" aria-live="polite">
        {dirty ? "•" : t("portal.settings.unchangedHint")}
      </p>
      <Button className="h-10" disabled={!dirty || saving} onClick={onSave}>
        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
        {saving ? t("portal.settings.saving") : t("portal.settings.save")}
      </Button>
    </div>
  )
}

function useSettingsSave(t: (k: string) => string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<OrgSettingsData>("/api/org/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_res, payload) => {
      if ("weekendConfig" in payload) toast.success(t("portal.settings.workweekToast"))
      else if ("pfEnabled" in payload || "pfPercent" in payload)
        toast.success(t("portal.settings.payrollToast"))
      else toast.success(t("portal.settings.savedToast"))
      void queryClient.invalidateQueries({ queryKey: ["org", "settings"] })
    },
    onError: (err: Error) => {
      const msg = err.message
      if (msg.includes("contactPhone")) toast.error(t("portal.settings.errInvalidPhone"))
      else if (msg.includes("contactEmail")) toast.error(t("portal.settings.errInvalidEmail"))
      else toast.error(t("portal.settings.saveFailed"))
    },
  })
}

// ── Profile card ──
function ProfileCard({ initial }: { initial: OrgSettingsData }) {
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

// ── Workweek card ──
function WorkweekCard({ initial }: { initial: OrgSettingsData }) {
  const { t } = useI18n()
  const [weekend, setWeekend] = useState<string[]>(initial.weekendConfig)
  const saveMutation = useSettingsSave(t)

  const dirty = useMemo(() => {
    const a = [...weekend].sort()
    const b = [...initial.weekendConfig].sort()
    return a.join(",") !== b.join(",")
  }, [initial, weekend])

  const toggleDay = (day: string) => {
    setWeekend((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
      <Card className="h-full border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-primary" aria-hidden />
            {t("portal.settings.workweekTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("portal.settings.workweekDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4">
            {DAY_KEYS.map((day) => {
              const isWeekend = weekend.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  role="switch"
                  aria-checked={isWeekend}
                  aria-label={`${dayLabel(day, t)} — ${
                    isWeekend ? t("portal.settings.weekendLabel") : t("portal.settings.workdayLabel")
                  }`}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isWeekend
                      ? "border-muted-foreground/25 bg-muted text-muted-foreground"
                      : "border-primary/30 bg-primary/10 text-primary",
                  )}
                >
                  <span className="text-xs font-semibold">{dayLabel(day, t)}</span>
                  {isWeekend ? (
                    <Circle className="size-3 opacity-60" aria-hidden />
                  ) : (
                    <CheckCircle2 className="size-3" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-primary/40 bg-primary/15" aria-hidden />
              {t("portal.settings.workdayLabel")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-muted-foreground/30 bg-muted" aria-hidden />
              {t("portal.settings.weekendLabel")}
            </span>
          </div>
          <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            {t("portal.settings.workweekHint")}
          </p>
          <SaveFooter
            dirty={dirty}
            saving={saveMutation.isPending}
            t={t}
            onSave={() => saveMutation.mutate({ weekendConfig: weekend })}
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Payroll config card ──
function PayrollConfigCard({ initial }: { initial: OrgSettingsData }) {
  const { lang, t } = useI18n()
  const [pfEnabled, setPfEnabled] = useState(initial.pfEnabled)
  const [pfPercent, setPfPercent] = useState(initial.pfPercent)
  const saveMutation = useSettingsSave(t)

  const dirty = pfEnabled !== initial.pfEnabled || pfPercent !== initial.pfPercent

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
      <Card className="h-full border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="size-4 text-primary" aria-hidden />
            {t("portal.settings.payrollTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("portal.settings.payrollDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("portal.settings.pfTitle")}</p>
              <p className="max-w-[26ch] text-xs leading-relaxed text-muted-foreground sm:max-w-none">
                {t("portal.settings.pfDesc")}
              </p>
            </div>
            <Switch
              checked={pfEnabled}
              onCheckedChange={setPfEnabled}
              aria-label={t("portal.settings.pfTitle")}
            />
          </div>

          <div className={cn("space-y-3 transition-opacity", !pfEnabled && "opacity-50")}>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t("portal.settings.pfPercentLabel")}</Label>
              <span className="font-mono text-2xl font-bold tabular-nums text-primary">
                {lang === "bn" ? toBnDigits(pfPercent) : pfPercent}
                {t("portal.settings.pfPercentUnit")}
              </span>
            </div>
            <Slider
              value={[pfPercent]}
              min={0}
              max={30}
              step={1}
              disabled={!pfEnabled}
              aria-label={t("portal.settings.pfPercentLabel")}
              onValueChange={(v) => setPfPercent(v[0] ?? pfPercent)}
            />
            <p className="text-[11px] text-muted-foreground">{t("portal.settings.pfPercentHint")}</p>
          </div>

          <p className="flex items-start gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-[11px] text-primary/90">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("portal.settings.pfNote")}
          </p>

          <SaveFooter
            dirty={dirty}
            saving={saveMutation.isPending}
            t={t}
            onSave={() => saveMutation.mutate({ pfEnabled, pfPercent })}
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Info card (read-only) ──
function InfoCard({
  data,
  planName,
  lang,
  t,
}: {
  data: OrgSettingsData
  planName: string
  lang: "bn" | "en"
  t: (k: string) => string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.15 }}
      className="lg:col-span-2"
    >
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4 text-primary" aria-hidden />
            {t("portal.settings.infoTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div className="divide-y divide-border/50">
              <InfoRow
                label={t("portal.settings.infoPlan")}
                value={<Badge className="border-primary/30 bg-primary/12 text-primary">{planName}</Badge>}
              />
              <InfoRow
                label={t("portal.settings.infoEmployees")}
                value={`${formatNumber(data.employeeCount, lang)} ${t("portal.common.person")}`}
              />
            </div>
            <div className="divide-y divide-border/50">
              <InfoRow
                label={t("portal.settings.infoSetup")}
                value={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-medium",
                      data.setupCompleted ? "text-success" : "text-warning",
                    )}
                  >
                    {data.setupCompleted ? (
                      <CheckCircle2 className="size-3.5" aria-hidden />
                    ) : (
                      <Circle className="size-3.5" aria-hidden />
                    )}
                    {data.setupCompleted
                      ? t("portal.settings.infoSetupDone")
                      : t("portal.settings.infoSetupPending")}
                  </span>
                }
              />
              <InfoRow label={t("portal.settings.infoCreated")} value={formatDate(data.createdAt, lang)} />
              <InfoRow
                label={t("portal.settings.infoDomain")}
                value={
                  <span className="inline-flex items-center gap-1 font-mono text-sm">
                    <Globe className="size-3.5 text-muted-foreground" aria-hidden />
                    {data.subdomain}.peopleflow.com
                  </span>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
