"use client"

// Attendance module — biometric device cards (horizontal scroll) + add-device dialog
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { Fingerprint, Plus, RefreshCw, ScanLine } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/fetcher"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ATT_ENDPOINTS, attendanceKeys, type DeviceRow, type DevicesData } from "./attendance-types"
import { formatRelativeTime } from "./attendance-labels"
import { useDeviceSync, useSyncPhase } from "./use-device-sync"

const DEVICE_MODELS = ["ZKTeco K40", "ZKTeco iClock 990", "ZKTeco SF300", "__other__"] as const

function DeviceCard({
  device,
  syncing,
  anySyncRunning,
  onSync,
}: {
  device: DeviceRow
  syncing: boolean
  anySyncRunning: boolean
  onSync: () => void
}) {
  const { lang, t } = useI18n()
  const phaseLabel = useSyncPhase(syncing)
  const online = device.status === "online"

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="w-[260px] shrink-0 snap-start sm:w-[280px]"
    >
      <Card className="pf-card-hover h-full border-border/80 bg-card shadow-xs">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  online ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                <Fingerprint className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={device.name}>
                  {device.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{device.model}</p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "gap-1.5 border px-2 text-[11px] font-medium",
                online
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-muted/60 text-muted-foreground",
              )}
            >
              <span className="relative flex size-1.5">
                {online && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                )}
                <span
                  className={cn("relative inline-flex size-1.5 rounded-full", online ? "bg-success" : "bg-muted-foreground/50")}
                />
              </span>
              {online ? t("portal.attendance.devices.online") : t("portal.attendance.devices.offline")}
            </Badge>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="truncate">
              <span className="text-foreground/70">{t("portal.attendance.devices.serial")}:</span>{" "}
              <span className="font-mono tracking-wide">{device.serialNo}</span>
            </p>
            <p className="truncate">
              {device.location ?? "—"}
              {device.ipAddress ? <span className="font-mono"> · {device.ipAddress}</span> : null}
            </p>
            <p className="flex items-center gap-1">
              <ScanLine className="size-3.5 shrink-0" aria-hidden />
              {t("portal.attendance.devices.lastSync")}: {formatRelativeTime(device.lastSyncAt, lang, t)}
            </p>
          </div>

          <div className="mt-auto space-y-2.5">
            <p className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
              {t("portal.attendance.devices.todayPunches")}:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatNumber(device.todayPunches, lang)}
              </span>{" "}
              {t("portal.attendance.devices.punchesUnit")}
            </p>

            <Button className="w-full" disabled={syncing || anySyncRunning} onClick={onSync}>
              <RefreshCw className={cn("size-4", syncing && "animate-spin")} aria-hidden />
              {syncing ? t("portal.attendance.sync.syncing") : t("portal.attendance.sync.syncNow")}
            </Button>

            <AnimatePresence>
              {syncing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <p className="truncate text-xs text-muted-foreground">{phaseLabel}</p>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: "92%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface DeviceForm {
  name: string
  serialNo: string
  model: string
  modelOther: string
  location: string
  ipAddress: string
}

const EMPTY_DEVICE: DeviceForm = {
  name: "",
  serialNo: "",
  model: "ZKTeco K40",
  modelOther: "",
  location: "",
  ipAddress: "",
}

const IP_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

function AddDeviceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<DeviceForm>({ ...EMPTY_DEVICE })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const model = form.model === "__other__" ? form.modelOther.trim() : form.model
      return apiFetch(ATT_ENDPOINTS.devices, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          serialNo: form.serialNo.trim(),
          model: model || null,
          location: form.location.trim() || null,
          ipAddress: form.ipAddress.trim() || null,
        }),
      })
    },
    onSuccess: () => {
      toast.success(t("portal.attendance.devices.saved"))
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.devices })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      if (err.message === "serial_taken") setError(t("portal.attendance.devices.serialTaken"))
      else setError(t("portal.attendance.toasts.error"))
    },
  })

  const submit = () => {
    setError(null)
    if (form.name.trim().length < 2) {
      setError(t("portal.attendance.devices.vName"))
      return
    }
    if (form.serialNo.trim().length < 2) {
      setError(t("portal.attendance.devices.vSerial"))
      return
    }
    if (form.model === "__other__" && form.modelOther.trim().length < 2) {
      setError(t("portal.attendance.devices.modelOtherPh"))
      return
    }
    if (form.ipAddress.trim() && !IP_RE.test(form.ipAddress.trim())) {
      setError(t("portal.attendance.devices.vIp"))
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("portal.attendance.devices.addTitle")}</DialogTitle>
          <DialogDescription>{t("portal.attendance.devices.addDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="device-name">{t("portal.attendance.devices.name")}</Label>
            <Input
              id="device-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t("portal.attendance.devices.namePh")}
              className="h-10"
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="device-serial">{t("portal.attendance.devices.serialNo")}</Label>
            <Input
              id="device-serial"
              value={form.serialNo}
              onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))}
              placeholder={t("portal.attendance.devices.serialPh")}
              className="h-10 font-mono"
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="device-model">{t("portal.attendance.devices.model")}</Label>
            <Select
              value={form.model}
              onValueChange={(v) => setForm((f) => ({ ...f, model: v ?? "ZKTeco K40" }))}
            >
              <SelectTrigger id="device-model" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEVICE_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m === "__other__" ? t("portal.attendance.devices.modelOther") : m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.model === "__other__" && (
              <Input
                value={form.modelOther}
                onChange={(e) => setForm((f) => ({ ...f, modelOther: e.target.value }))}
                placeholder={t("portal.attendance.devices.modelOtherPh")}
                className="h-10"
                maxLength={60}
                aria-label={t("portal.attendance.devices.modelOther")}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="device-location">
                {t("portal.attendance.devices.location")}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({t("portal.common.optional")})
                </span>
              </Label>
              <Input
                id="device-location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="h-10"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="device-ip">
                {t("portal.attendance.devices.ipAddress")}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({t("portal.common.optional")})
                </span>
              </Label>
              <Input
                id="device-ip"
                value={form.ipAddress}
                onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
                placeholder="192.168.1.201"
                className="h-10 font-mono"
                inputMode="numeric"
              />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>
            {t("portal.common.cancel")}
          </Button>
          <Button disabled={mutation.isPending} onClick={submit}>
            {mutation.isPending ? t("portal.common.saving") : t("portal.attendance.devices.submitAdd")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DeviceCards() {
  const { t } = useI18n()
  const [addOpen, setAddOpen] = useState(false)
  const sync = useDeviceSync()

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: attendanceKeys.devices,
    queryFn: () => apiFetch<DevicesData>(ATT_ENDPOINTS.devices),
  })

  return (
    <section aria-label={t("portal.attendance.devices.title")} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          {t("portal.attendance.devices.title")}
        </h2>
      </div>

      {isPending ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[260px] shrink-0 sm:w-[280px]">
              <Skeleton className="h-56 rounded-xl" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-4">
          <p className="text-sm text-muted-foreground">{t("portal.attendance.errors.loadFailed")}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 pf-scrollbar">
          {(data?.items ?? []).map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              syncing={sync.isPending && sync.variables?.deviceId === device.id}
              anySyncRunning={sync.isPending}
              onSync={() => sync.mutate({ deviceId: device.id })}
            />
          ))}

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex min-h-[44px] w-[260px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary sm:w-[280px]"
            aria-label={t("portal.attendance.devices.addDevice")}
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Plus className="size-5" aria-hidden />
            </span>
            <span className="text-sm font-medium">{t("portal.attendance.devices.addDevice")}</span>
          </button>
        </div>
      )}

      <AddDeviceDialog open={addOpen} onOpenChange={setAddOpen} />
    </section>
  )
}
