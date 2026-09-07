// Zod schemas for /api/org/performance routes (Task 3-performance owned)
// Error strings are machine-readable codes — the portal UI maps them to i18n.
import { z } from "zod"
import { APPRAISAL_CRITERIA } from "./helpers"

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const isoDate = z
  .string()
  .trim()
  .regex(DATE_RE, "invalid_date")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), "invalid_date")

export const GOAL_UNITS = ["%", "টাকা", "ইউনিট"] as const

export const goalCreateSchema = z
  .object({
    employeeId: z.string().trim().min(1, "invalid_employee"),
    title: z.string().trim().min(2, "invalid_title").max(120, "invalid_title"),
    description: z.preprocess(
      emptyToNull,
      z.string().trim().max(500, "invalid_description").nullable().optional(),
    ),
    unit: z.enum(GOAL_UNITS, { error: "invalid_unit" }),
    targetValue: z.coerce
      .number()
      .finite("invalid_target")
      .positive("invalid_target")
      .max(1_000_000_000, "invalid_target"),
    currentValue: z.coerce
      .number()
      .min(0, "invalid_current")
      .max(1_000_000_000, "invalid_current")
      .optional()
      .default(0),
    startDate: isoDate,
    dueDate: isoDate,
    weight: z.coerce
      .number()
      .int("invalid_weight")
      .min(1, "invalid_weight")
      .max(5, "invalid_weight")
      .optional()
      .default(3),
  })
  .refine((v) => v.dueDate >= v.startDate, { message: "invalid_range", path: ["dueDate"] })

export const goalPatchSchema = z
  .object({
    currentValue: z.coerce
      .number()
      .finite("invalid_current")
      .min(0, "invalid_current")
      .max(1_000_000_000, "invalid_current")
      .optional(),
    status: z.enum(["completed", "cancelled"], { error: "invalid_status" }).optional(),
  })
  .refine((v) => v.currentValue !== undefined || v.status !== undefined, {
    message: "empty_patch",
    path: [],
  })

const appraisalItemSchema = z.object({
  criterion: z.enum(APPRAISAL_CRITERIA, { error: "invalid_criterion" }),
  score: z.coerce.number().int("invalid_score").min(1, "invalid_score").max(5, "invalid_score"),
  comment: z.preprocess(
    emptyToNull,
    z.string().trim().max(300, "invalid_comment").nullable().optional(),
  ),
})

const noDuplicateCriteria = (items: { criterion: string }[] | undefined): boolean =>
  (items ?? []).length === 0 || new Set((items ?? []).map((i) => i.criterion)).size === (items ?? []).length

export const appraisalCreateSchema = z
  .object({
    employeeId: z.string().trim().min(1, "invalid_employee"),
    period: z.string().trim().regex(/^\d{4}-H[12]$/, "invalid_period"),
    selfNote: z.preprocess(
      emptyToNull,
      z.string().trim().max(500, "invalid_note").nullable().optional(),
    ),
    items: z.array(appraisalItemSchema).max(5, "invalid_items").optional(),
  })
  .refine((v) => noDuplicateCriteria(v.items), { message: "duplicate_criterion", path: ["items"] })

export const appraisalPatchSchema = z
  .object({
    items: z.array(appraisalItemSchema).max(5, "invalid_items").optional(),
    selfNote: z.preprocess(
      emptyToNull,
      z.string().trim().max(500, "invalid_note").nullable().optional(),
    ),
    reviewerNote: z.preprocess(
      emptyToNull,
      z.string().trim().max(500, "invalid_note").nullable().optional(),
    ),
    action: z.enum(["submit", "finalize"], { error: "invalid_action" }).optional(),
  })
  .refine(
    (v) => v.items !== undefined || v.selfNote !== undefined || v.reviewerNote !== undefined || v.action !== undefined,
    { message: "empty_patch", path: [] },
  )
  .refine((v) => noDuplicateCriteria(v.items), { message: "duplicate_criterion", path: ["items"] })

/** Flatten ZodIssues into a readable code list for the error envelope. */
export function zodPerfError(error: z.ZodError): string {
  const parts = error.issues.map((i) => `${i.path.join(".") || "body"}:${i.code}`)
  return `validation_failed (${parts.join(", ")})`
}
