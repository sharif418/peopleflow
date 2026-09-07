// Frappe client factory + ERPNext↔PeopleFlow entity sync map.
//
// Phase 1 (now): ERPNEXT_BASE_URL is unset → all data lives in the control-plane
// Prisma DB (demo mode). The sync layer below is the production bridge.
//
// Phase 2 (deploy): each Organization row maps to an isolated ERPNext site
// (org.subdomain → {subdomain}.peopleflow.com). The control plane stays the
// source of truth for tenants/plans/flags; HR data syncs into each site.

import { ErpNextClient } from "./erpnext-client"
import { DOCTYPES, type FrappeClient } from "./types"

export function isErpNextMode(): boolean {
  return Boolean(process.env.ERPNEXT_BASE_URL)
}

/** Get a client bound to a specific organization's ERPNext site (production). */
export function frappeClientForOrg(baseUrl?: string): FrappeClient {
  const base = baseUrl ?? process.env.ERPNEXT_BASE_URL
  if (!base) {
    throw new Error(
      "ERPNext mode not configured — set ERPNEXT_BASE_URL / ERPNEXT_API_KEY / ERPNEXT_API_SECRET",
    )
  }
  return new ErpNextClient({
    baseUrl: base,
    apiKey: process.env.ERPNEXT_API_KEY ?? "",
    apiSecret: process.env.ERPNEXT_API_SECRET ?? "",
  })
}

// ─── PeopleFlow ↔ ERPNext field mapping (HR Core) ────────────────────────────

export const EMPLOYEE_FIELD_MAP = {
  employeeCode: "employee_number",
  firstName: "first_name",
  lastName: "last_name",
  email: "personal_email",
  phone: "cell_number",
  gender: "gender",
  dateOfBirth: "date_of_birth",
  dateOfJoining: "date_of_joining",
  employmentType: "employment_type",
  status: "status",
  branch: "branch",
  department: "department",
  designation: "designation",
} as const

export const SHIFT_FIELD_MAP = {
  name: "shift_type_name",
  startTime: "start_time",
  endTime: "end_time",
} as const

export { DOCTYPES }
