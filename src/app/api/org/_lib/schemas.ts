// Shared Zod schemas for /api/org routes (portal agent owned)
// Error strings are machine-readable codes — the portal UI maps them to i18n.
import { z } from "zod"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s-]{7,19}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v)
const numOrNull = (v: unknown) => (v === "" || v === null || v === undefined ? null : v)

export const nameField = z.string().trim().min(2).max(60)
export const addressField = z.preprocess(
  emptyToNull,
  z.string().trim().max(200).nullable().optional(),
)
export const timeField = z.string().trim().regex(TIME_RE, "invalid_time")

export const departmentSchema = z.object({ name: nameField })
export const departmentPatchSchema = z.object({ name: nameField })
export const designationSchema = z.object({ name: nameField })
export const designationPatchSchema = z.object({ name: nameField })
export const branchSchema = z.object({ name: nameField, address: addressField })
export const branchPatchSchema = z.object({ name: nameField, address: addressField })
export const shiftSchema = z.object({
  name: nameField,
  startTime: timeField,
  endTime: timeField,
})
export const shiftPatchSchema = z.object({
  name: nameField,
  startTime: timeField.optional(),
  endTime: timeField.optional(),
})

const optionalId = z.preprocess(emptyToNull, z.string().trim().min(1).nullable().optional())

export const employeeCreateSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  employeeCode: z.preprocess(
    emptyToNull,
    z.string().trim().min(2).max(30).nullable().optional(),
  ),
  email: z.preprocess(
    emptyToNull,
    z.string().trim().max(120).regex(EMAIL_RE, "invalid_email").nullable().optional(),
  ),
  phone: z.preprocess(
    emptyToNull,
    z.string().trim().max(20).regex(PHONE_RE, "invalid_phone").nullable().optional(),
  ),
  gender: z.preprocess(
    emptyToNull,
    z.enum(["male", "female", "other"]).nullable().optional(),
  ),
  dateOfJoining: z
    .string()
    .trim()
    .regex(DATE_RE, "invalid_date")
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "invalid_date"),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]).default("full_time"),
  status: z.enum(["active", "probation", "suspended", "inactive"]).default("active"),
  monthlySalary: z.preprocess(
    numOrNull,
    z.coerce.number().int().min(0).max(10_000_000).nullable().optional(),
  ),
  departmentId: optionalId,
  designationId: optionalId,
  branchId: optionalId,
  shiftId: optionalId,
})

export const employeePatchSchema = employeeCreateSchema.partial()

// ─── First-run setup wizard ──────────────────────────────────────────────────

export const setupEmployeeSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  phone: z.preprocess(
    emptyToNull,
    z.string().trim().max(20).regex(PHONE_RE, "invalid_phone").nullable().optional(),
  ),
  gender: z.preprocess(
    emptyToNull,
    z.enum(["male", "female", "other"]).nullable().optional(),
  ),
  dateOfJoining: z
    .string()
    .trim()
    .regex(DATE_RE, "invalid_date")
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "invalid_date"),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]).default("full_time"),
  monthlySalary: z.preprocess(
    numOrNull,
    z.coerce.number().int().min(0).max(10_000_000).nullable().optional(),
  ),
  departmentName: z.preprocess(emptyToNull, z.string().trim().max(60).nullable().optional()),
  designationName: z.preprocess(emptyToNull, z.string().trim().max(60).nullable().optional()),
  shiftName: z.preprocess(emptyToNull, z.string().trim().max(60).nullable().optional()),
})

export const setupSchema = z.object({
  departments: z.array(z.object({ name: nameField })).max(50),
  designations: z.array(z.object({ name: nameField })).max(50),
  shifts: z
    .array(
      z.object({
        name: nameField,
        startTime: timeField,
        endTime: timeField,
      }),
    )
    .max(50),
  employees: z.array(setupEmployeeSchema).max(50).optional(),
})

/** Flatten ZodIssues into a readable code list for the error envelope. */
export function zodError(error: z.ZodError): string {
  const parts = error.issues.map((i) => `${i.path.join(".") || "body"}:${i.code}`)
  return `validation_failed (${parts.join(", ")})`
}
