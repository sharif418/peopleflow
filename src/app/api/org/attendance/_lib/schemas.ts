// Attendance module Zod schemas (Task 4-a owned)
// Error strings are machine-readable codes — the attendance UI maps them to i18n.
import { z } from "zod"
import { LOG_STATUSES } from "./attendance"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const IP_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v)
const dateStr = z.string().trim().regex(DATE_RE, "invalid_date")
const timeStr = z.string().trim().regex(TIME_RE, "invalid_time")
const ipField = z.preprocess(
  emptyToNull,
  z.string().trim().regex(IP_RE, "invalid_ip").nullable().optional(),
)

// ── Manual punch upsert ──────────────────────────────────────────────────────
export const punchSchema = z.object({
  employeeId: z.string().trim().min(1, "employee_required"),
  date: dateStr,
  checkIn: z.preprocess(emptyToNull, timeStr.nullable().optional()),
  checkOut: z.preprocess(emptyToNull, timeStr.nullable().optional()),
  status: z.preprocess(emptyToNull, z.enum(LOG_STATUSES).nullable().optional()),
  note: z.preprocess(
    emptyToNull,
    z.string().trim().max(200, "note_too_long").nullable().optional(),
  ),
})

// ── Device sync ──────────────────────────────────────────────────────────────
export const syncSchema = z.object({
  deviceId: z.preprocess(emptyToNull, z.string().trim().min(1).nullable().optional()),
  date: z.preprocess(emptyToNull, dateStr.nullable().optional()),
  mode: z.enum(["full", "missing"]).default("missing"),
})

// ── Devices ──────────────────────────────────────────────────────────────────
export const deviceCreateSchema = z.object({
  name: z.string().trim().min(2, "name_required").max(80, "name_too_long"),
  serialNo: z.string().trim().min(2, "serial_required").max(60, "serial_too_long"),
  model: z.preprocess(
    emptyToNull,
    z.string().trim().max(60, "model_too_long").nullable().optional(),
  ),
  location: z.preprocess(
    emptyToNull,
    z.string().trim().max(120, "location_too_long").nullable().optional(),
  ),
  ipAddress: ipField,
})

export const devicePatchSchema = z.object({
  name: z.string().trim().min(2, "name_required").max(80, "name_too_long").optional(),
  location: z.preprocess(
    emptyToNull,
    z.string().trim().max(120, "location_too_long").nullable().optional(),
  ),
  ipAddress: ipField,
  status: z.enum(["online", "offline"]).optional(),
})

/** Flatten ZodIssues into a readable code list for the error envelope. */
export function zodError(error: z.ZodError): string {
  const parts = error.issues.map((i) => `${i.path.join(".") || "body"}:${i.code}`)
  return `validation_failed (${parts.join(", ")})`
}
