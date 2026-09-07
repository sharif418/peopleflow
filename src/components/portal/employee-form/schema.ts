// Employee form schema + shared form types (zod, bilingual error messages).
import { z } from "zod"
import type { TranslateFn } from "@/lib/i18n"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface FormValues {
  firstName: string
  lastName: string
  employeeCode: string
  email: string
  phone: string
  gender: string
  dateOfJoining: string
  employmentType: "full_time" | "part_time" | "contract" | "intern"
  status: "active" | "probation" | "suspended" | "inactive"
  monthlySalary: string
  departmentId: string
  designationId: string
  branchId: string
  shiftId: string
}

export function buildSchema(t: TranslateFn) {
  return z.object({
    firstName: z.string().trim().min(2, t("portal.employees.vFirstName")).max(60),
    lastName: z.string().trim().min(2, t("portal.employees.vLastName")).max(60),
    employeeCode: z.string().trim().max(30),
    email: z
      .string()
      .trim()
      .max(120)
      .refine((v) => !v || EMAIL_RE.test(v), t("portal.employees.vEmail")),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine((v) => !v || /^[\d+\-\s]{8,20}$/.test(v), t("portal.employees.vPhone")),
    gender: z.string(),
    dateOfJoining: z
      .string()
      .trim()
      .min(1, t("portal.employees.vDate"))
      .regex(DATE_RE, t("portal.employees.vDateInvalid")),
    employmentType: z.enum(["full_time", "part_time", "contract", "intern"]),
    status: z.enum(["active", "probation", "suspended", "inactive"]),
    monthlySalary: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (Number(v) >= 0 && Number(v) <= 10_000_000),
        t("portal.employees.vSalary"),
      ),
    departmentId: z.string(),
    designationId: z.string(),
    branchId: z.string(),
    shiftId: z.string(),
  })
}

export const EMPTY: FormValues = {
  firstName: "",
  lastName: "",
  employeeCode: "",
  email: "",
  phone: "",
  gender: "",
  dateOfJoining: "",
  employmentType: "full_time",
  status: "active",
  monthlySalary: "",
  departmentId: "",
  designationId: "",
  branchId: "",
  shiftId: "",
}
