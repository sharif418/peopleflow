// Zod schemas for /api/org/payroll routes (owned by Task 4-c agent).
// Error strings are machine-readable codes — the payroll UI maps them to i18n.
import { z } from "zod"
import type { ComponentInput } from "./payroll"

export const componentSchema = z.object({
  name: z.string().trim().min(2).max(60),
  abbr: z
    .string()
    .trim()
    .regex(/^[A-Z][A-Z0-9]{1,7}$/, "invalid_abbr"),
  type: z.enum(["earning", "deduction"]),
  calcType: z.enum(["percent", "fixed"]),
  value: z.number().min(0).max(100_000_000),
})

export const componentListSchema = z.array(componentSchema).min(1).max(20)

export const structureCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  components: componentListSchema,
})

export const structurePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    isDefault: z.boolean().optional(),
    components: componentListSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "empty" })

export const generateSchema = z.object({
  period: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "invalid_period"),
  structureId: z.string().trim().min(1).optional(),
})

export const payslipActionSchema = z.object({
  action: z.enum(["confirm", "mark_paid", "revert_draft"]),
})

/** BD payroll business rules on a component list. Returns an error code or null. */
export function componentRules(components: ComponentInput[]): string | null {
  if (components.filter((c) => c.type === "earning").length === 0) return "min_earning"
  for (const c of components) {
    if (c.calcType === "percent" && (c.value < 0 || c.value > 100)) return "percent_range"
    if (c.calcType === "fixed" && c.value < 0) return "fixed_range"
  }
  const earningPercentSum = components
    .filter((c) => c.type === "earning" && c.calcType === "percent")
    .reduce((acc, c) => acc + c.value, 0)
  if (earningPercentSum > 100) return "percent_sum"
  return null
}

/** Flatten ZodIssues into a readable code list for the error envelope. */
export function zodError(error: z.ZodError): string {
  const parts = error.issues.map((i) => `${i.path.join(".") || "body"}:${i.code}`)
  return `validation_failed (${parts.join(", ")})`
}
