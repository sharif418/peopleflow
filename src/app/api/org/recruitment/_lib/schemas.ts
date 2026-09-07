// Zod schemas for /api/org/recruitment routes (Task 3-recruitment owned)
// Error strings are machine-readable codes — the portal UI maps them to i18n.
import { z } from "zod"
import { EMPLOYMENT_TYPES, INTERVIEW_MODES, INTERVIEW_RESULTS, JOB_STATUSES } from "./helpers"

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const isoDate = z
  .string()
  .trim()
  .regex(DATE_RE, "invalid_date")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), "invalid_date")

const nullableId = z.preprocess(emptyToNull, z.string().trim().min(1).nullable().optional())

// ─── Job postings ─────────────────────────────────────────────────────────────

export const jobPostingCreateSchema = z.object({
  title: z.string().trim().min(2, "invalid_title").max(80, "invalid_title"),
  departmentId: nullableId,
  designationId: nullableId,
  employmentType: z.enum(EMPLOYMENT_TYPES, { error: "invalid_employment_type" }).default("full_time"),
  vacancies: z.coerce.number().int("invalid_vacancies").min(1, "invalid_vacancies").max(99, "invalid_vacancies"),
  description: z.preprocess(emptyToNull, z.string().trim().max(2000, "invalid_description").nullable().optional()),
  closesAt: z.preprocess(emptyToNull, isoDate.nullable().optional()),
})

export const jobPostingPatchSchema = z
  .object({
    title: z.string().trim().min(2, "invalid_title").max(80, "invalid_title").optional(),
    departmentId: z.preprocess(
      emptyToNull,
      z.union([z.string().trim().min(1), z.literal(null)]).optional(),
    ),
    designationId: z.preprocess(
      emptyToNull,
      z.union([z.string().trim().min(1), z.literal(null)]).optional(),
    ),
    employmentType: z.enum(EMPLOYMENT_TYPES, { error: "invalid_employment_type" }).optional(),
    vacancies: z.coerce.number().int("invalid_vacancies").min(1, "invalid_vacancies").max(99, "invalid_vacancies").optional(),
    description: z.preprocess(emptyToNull, z.string().trim().max(2000, "invalid_description").nullable().optional()),
    status: z.enum(JOB_STATUSES, { error: "invalid_status" }).optional(),
    closesAt: z.preprocess(emptyToNull, z.union([isoDate, z.literal(null)]).optional()),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "empty_patch", path: ["body"] })

// ─── Applications ─────────────────────────────────────────────────────────────

const BD_PHONE_RE = /^(?:\+?880|0)1[3-9]\d{8}$/

export const applicationCreateSchema = z.object({
  jobPostingId: z.string().trim().min(1, "invalid_job"),
  candidateName: z.string().trim().min(2, "invalid_name").max(80, "invalid_name"),
  candidateEmail: z.preprocess(
    emptyToNull,
    z.string().trim().email("invalid_email").max(120, "invalid_email").nullable().optional(),
  ),
  candidatePhone: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .regex(BD_PHONE_RE, "invalid_phone")
      .max(20, "invalid_phone")
      .nullable()
      .optional(),
  ),
  expectedSalary: z.preprocess(
    emptyToNull,
    z.coerce
      .number({ error: "invalid_salary" })
      .int("invalid_salary")
      .min(0, "invalid_salary")
      .max(9_999_999, "invalid_salary")
      .nullable()
      .optional(),
  ),
  coverNote: z.preprocess(emptyToNull, z.string().trim().max(1000, "invalid_cover_note").nullable().optional()),
})

export const applicationPatchSchema = z
  .object({
    stage: z.enum(["applied", "screening", "interview", "offer", "hired", "rejected"], {
      error: "invalid_stage",
    }).optional(),
    rating: z.coerce.number().int("invalid_rating").min(0, "invalid_rating").max(5, "invalid_rating").optional(),
    notes: z.preprocess(emptyToNull, z.string().trim().max(1000, "invalid_notes").nullable().optional()),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "empty_patch", path: ["body"] })

// ─── Interviews ───────────────────────────────────────────────────────────────

export const interviewCreateSchema = z.object({
  round: z.coerce.number().int("invalid_round").min(1, "invalid_round").max(10, "invalid_round"),
  mode: z.enum(INTERVIEW_MODES, { error: "invalid_mode" }).default("onsite"),
  scheduledAt: z.string().trim().min(1, "invalid_datetime"),
  interviewer: z.preprocess(emptyToNull, z.string().trim().max(60, "invalid_interviewer").nullable().optional()),
})

export const interviewPatchSchema = z
  .object({
    feedback: z.preprocess(emptyToNull, z.string().trim().max(1000, "invalid_feedback").nullable().optional()),
    result: z.enum(INTERVIEW_RESULTS, { error: "invalid_result" }).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "empty_patch", path: ["body"] })

/** Flatten ZodIssues into a readable code list for the error envelope. */
export function zodRecruitmentError(error: z.ZodError): string {
  const parts = error.issues.map((i) => `${i.path.join(".") || "body"}:${i.message || i.code}`)
  return `validation_failed (${parts.join(", ")})`
}
