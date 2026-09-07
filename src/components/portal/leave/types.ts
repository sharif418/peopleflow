// Leave module API types + query keys + endpoints (Task 4-b owned)
export interface LeaveTypeRow {
  id: string
  name: string
  daysPerYear: number
  isPaid: boolean
  carryForward: boolean
  createdAt: string
  approvedRequests: number
  pendingRequests: number
  employeesOnLeaveToday: number
}

export interface LeaveTypesData {
  items: LeaveTypeRow[]
}

export interface LeaveRequestEmployee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  designation: { id: string; name: string } | null
  department: { id: string; name: string } | null
}

export interface LeaveTypeRef {
  id: string
  name: string
  daysPerYear: number
  isPaid: boolean
  carryForward: boolean
}

export interface LeaveRequestRow {
  id: string
  fromDate: string
  toDate: string
  days: number
  reason: string | null
  status: string
  reviewerNote: string | null
  reviewedAt: string | null
  createdAt: string
  employee: LeaveRequestEmployee
  leaveType: LeaveTypeRef
  overlapsExisting: boolean
  exceedsBalance: boolean
  balanceAvailable: number
}

export interface LeaveRequestsSummary {
  pending: number
  approvedToday: number
  approvedMonth: number
  onLeaveToday: number
  rejectedMonth: number
  totalTypes: number
}

export interface LeaveRequestsData {
  items: LeaveRequestRow[]
  total: number
  page: number
  pageSize: number
  summary: LeaveRequestsSummary
}

export interface LeaveRequestsFilters {
  status: string
  employeeId: string
  q: string
  page: number
}

export interface LeaveBalanceRow {
  leaveTypeId: string
  name: string
  allocated: number
  used: number
  pending: number
  remaining: number
}

export interface LeaveBalanceEmployee {
  employeeId: string
  code: string
  name: string
  department: string | null
  rows: LeaveBalanceRow[]
  totalUsed: number
}

export interface LeaveBalancesData {
  year: string
  types: { id: string; name: string }[]
  items: LeaveBalanceEmployee[]
}

export type LeaveAction = "approve" | "reject" | "cancel"

export const LEAVE_ENDPOINTS = {
  types: "/api/org/leave/types",
  typeItem: (id: string) => `/api/org/leave/types/${id}`,
  requests: "/api/org/leave/requests",
  requestItem: (id: string) => `/api/org/leave/requests/${id}`,
  balances: (year: string) => `/api/org/leave/balances?year=${encodeURIComponent(year)}`,
} as const

export const leaveKeys = {
  all: ["org", "leave"] as const,
  types: ["org", "leave", "types"] as const,
  requests: (filters: LeaveRequestsFilters) => ["org", "leave", "requests", filters] as const,
  balances: (year: string) => ["org", "leave", "balances", year] as const,
}

/** Default filters of the requests inbox (also drives the module stats row). */
export const DEFAULT_REQUEST_FILTERS: LeaveRequestsFilters = {
  status: "",
  employeeId: "",
  q: "",
  page: 1,
}

export const LEAVE_STATUS_FILTERS = [
  { value: "", statuses: "" },
  { value: "pending", statuses: "pending" },
  { value: "approved", statuses: "approved" },
  { value: "closed", statuses: "cancelled,rejected" },
] as const

export function statusesForFilter(value: string): string {
  return LEAVE_STATUS_FILTERS.find((f) => f.value === value)?.statuses ?? ""
}
