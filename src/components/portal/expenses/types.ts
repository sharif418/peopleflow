// Expense module API types + query keys + endpoints (Task 3-expenses owned)
export const EXPENSE_CATEGORIES = [
  "travel",
  "food",
  "office_supplies",
  "client_entertainment",
  "utilities",
  "training",
  "other",
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export type ClaimStatus = "submitted" | "approved" | "rejected" | "paid"

export type ClaimAction = "approve" | "reject" | "mark_paid"

export interface ClaimEmployee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  designation: { id: string; name: string } | null
  department: { id: string; name: string } | null
}

export interface ExpenseItemRow {
  id: string
  claimId: string
  label: string
  amount: number
  note: string | null
}

/** Claim as returned by the list endpoint (employee + item count, no items). */
export interface ClaimRow {
  id: string
  title: string
  category: ExpenseCategory
  expenseDate: string
  totalAmount: number
  status: ClaimStatus
  description: string | null
  reviewerNote: string | null
  reviewedAt: string | null
  createdAt: string
  employee: ClaimEmployee
  _count: { items: number }
}

/** Claim as returned by detail/create (full line items). */
export interface ClaimDetail extends Omit<ClaimRow, "_count"> {
  items: ExpenseItemRow[]
}

export interface ClaimsSummary {
  pending: number
  pendingAmount: number
  approvedMonthAmount: number
  totalClaims: number
}

export interface ClaimsData {
  items: ClaimRow[]
  total: number
  page: number
  pageSize: number
  summary: ClaimsSummary
}

export interface ClaimsFilters {
  status: string
  employeeId: string
  category: string
  q: string
  page: number
}

export const EXPENSE_ENDPOINTS = {
  claims: "/api/org/expenses/claims",
  claimItem: (id: string) => `/api/org/expenses/claims/${id}`,
} as const

export const expenseKeys = {
  all: ["org", "expense"] as const,
  claims: (filters: ClaimsFilters) => ["org", "expense", "claims", filters] as const,
  detail: (id: string) => ["org", "expense", "claim", id] as const,
}

/** Default filters of the claims inbox (also drives the module stats row). */
export const DEFAULT_CLAIM_FILTERS: ClaimsFilters = {
  status: "",
  employeeId: "",
  category: "",
  q: "",
  page: 1,
}

/** Status select options for the claims tab filter row. */
export const CLAIM_STATUS_FILTERS = [
  { value: "", label: "filter.all" },
  { value: "submitted", label: "filter.submitted" },
  { value: "approved", label: "filter.approved" },
  { value: "rejected", label: "filter.rejected" },
  { value: "paid", label: "filter.paid" },
] as const
