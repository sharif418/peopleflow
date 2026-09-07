// Frappe/ERPNext client contract — used by the sync layer in production.
// In Phase 1 (sandbox/demo) the control-plane Prisma DB simulates these calls;
// when ERPNEXT_BASE_URL is configured, ErpNextClient talks to a real Frappe site.

export interface FrappeDocFilters {
  [field: string]: unknown
}

export interface FrappeListOptions {
  filters?: FrappeDocFilters
  fields?: string[]
  limit?: number
  offset?: number
  orderBy?: string
}

export interface FrappeDoc {
  name: string
  doctype: string
  [key: string]: unknown
}

export interface FrappePaginated<T = FrappeDoc> {
  data: T[]
  total: number
}

export interface FrappeClient {
  /** GET /api/resource/{doctype} — list documents */
  getDocList(doctype: string, options?: FrappeListOptions): Promise<FrappePaginated>
  /** GET /api/resource/{doctype}/{name} — single document */
  getDoc(doctype: string, name: string): Promise<FrappeDoc>
  /** POST /api/resource/{doctype} — create */
  createDoc(doctype: string, values: Record<string, unknown>): Promise<FrappeDoc>
  /** PUT /api/resource/{doctype}/{name} — update */
  updateDoc(doctype: string, name: string, values: Record<string, unknown>): Promise<FrappeDoc>
  /** DELETE /api/resource/{doctype}/{name} */
  deleteDoc(doctype: string, name: string): Promise<{ message: string }>
  /** POST /api/method/{method} — call whitelisted method */
  callMethod(method: string, payload?: Record<string, unknown>): Promise<unknown>
  /** Site/health info */
  ping(): Promise<{ ok: boolean; version?: string; message?: string }>
}

// Doctype names used by PeopleFlow (mirrors ERPNext HRMS)
export const DOCTYPES = {
  COMPANY: "Company",
  EMPLOYEE: "Employee",
  DEPARTMENT: "Department",
  DESIGNATION: "Designation",
  BRANCH: "Branch",
  SHIFT_TYPE: "Shift Type",
  ATTENDANCE: "Attendance",
  LEAVE_APPLICATION: "Leave Application",
  SALARY_STRUCTURE: "Salary Structure",
  USER: "User",
} as const
