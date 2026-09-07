// Zod schemas for /api/org/expenses routes (Task 3-expenses owned)
// Error strings are machine-readable codes — the portal UI maps them to i18n.
import { z } from "zod"
import { EXPENSE_CATEGORIES } from "./helpers"

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const isoDate = z
  .string()
  .trim()
  .regex(DATE_RE, "invalid_date")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), "invalid_date")

export const claimItemSchema = z.object({
  label: z.string().trim().min(2, "invalid_label").max(80, "invalid_label"),
  amount: z.coerce.number().int("invalid_amount").min(1, "invalid_amount").max(10_000_000, "invalid_amount"),
  note: z.preprocess(emptyToNull, z.string().trim().max(200, "invalid_note").nullable().optional()),
})

export const claimCreateSchema = z.object({
  employeeId: z.string().trim().min(1, "invalid_employee"),
  title: z.string().trim().min(2, "invalid_title").max(120, "invalid_title"),
  category: z.enum(EXPENSE_CATEGORIES, { error: "invalid_category" }),
  expenseDate: isoDate,
  description: z.preprocess(emptyToNull, z.string().trim().max(500, "invalid_description").nullable().optional()),
  items: z.array(claimItemSchema).min(1, "no_items").max(20, "too_many_items"),
})

export const claimActionSchema = z.object({
  action: z.enum(["approve", "reject", "mark_paid"], { error: "invalid_action" }),
  note: z.preprocess(emptyToNull, z.string().trim().max(300, "invalid_note").nullable().optional()),
})

/** Flatten ZodIssues into a readable code list for the error envelope. */
export function zodExpenseError(error: z.ZodError): string {
  const parts = error.issues.map((i) => `${i.path.join(".") || "body"}:${i.code}`)
  return `validation_failed (${parts.join(", ")})`
}
