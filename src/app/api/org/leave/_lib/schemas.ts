// Zod schemas for /api/org/leave routes (Task 4-b owned)
// Error strings are machine-readable codes — the portal UI maps them to i18n.
import { z } from "zod"

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const isoDate = z
  .string()
  .trim()
  .regex(DATE_RE, "invalid_date")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), "invalid_date")

export const leaveTypeCreateSchema = z.object({
  name: z.string().trim().min(2, "invalid_name").max(60, "invalid_name"),
  daysPerYear: z.coerce.number().int("invalid_days").min(1, "invalid_days").max(365, "invalid_days"),
  isPaid: z.boolean().default(true),
  carryForward: z.boolean().default(false),
})

export const leaveTypePatchSchema = z.object({
  name: z.string().trim().min(2, "invalid_name").max(60, "invalid_name").optional(),
  daysPerYear: z.coerce.number().int("invalid_days").min(1, "invalid_days").max(365, "invalid_days").optional(),
  isPaid: z.boolean().optional(),
  carryForward: z.boolean().optional(),
})

export const leaveRequestCreateSchema = z.object({
  employeeId: z.string().trim().min(1, "invalid_employee"),
  leaveTypeId: z.string().trim().min(1, "invalid_leave_type"),
  fromDate: isoDate,
  toDate: isoDate,
  reason: z.preprocess(emptyToNull, z.string().trim().max(300, "invalid_reason").nullable().optional()),
})

export const leaveRequestActionSchema = z.object({
  action: z.enum(["approve", "reject", "cancel"], { error: "invalid_action" }),
  note: z.preprocess(emptyToNull, z.string().trim().max(300, "invalid_note").nullable().optional()),
})

/** Flatten ZodIssues into a readable code list for the error envelope. */
export function zodLeaveError(error: z.ZodError): string {
  const parts = error.issues.map((i) => `${i.path.join(".") || "body"}:${i.code}`)
  return `validation_failed (${parts.join(", ")})`
}
