// Portal API types (mirror of /api/org response shapes)
export interface RelationRef {
  id: string
  name: string
}

export interface EmployeeRow {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  gender: string | null
  dateOfJoining: string
  employmentType: string
  status: string
  monthlySalary: number | null
  departmentId: string | null
  designationId: string | null
  branchId: string | null
  shiftId: string | null
  department: RelationRef | null
  designation: RelationRef | null
  branch: RelationRef | null
  shift: RelationRef | null
}

export interface EmployeesPage {
  items: EmployeeRow[]
  total: number
  page: number
  pageSize: number
  nextCode: string
}

export interface OverviewAttendanceDay {
  date: string
  present: number
  absent: number
  late: number
  onLeave: number
}

export interface OverviewData {
  employees: { total: number; active: number; probation: number; inactive: number }
  attendanceToday: { present: number; absent: number; late: number; onLeave: number }
  payrollMonthly: number
  attendance: OverviewAttendanceDay[]
  headcountByDept: { name: string | null; count: number }[]
  salaryByDept?: { name: string | null; total: number }[]
  pendingLeaveRequests?: number
  recentHires: {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
    designation: string | null
    department: string | null
    dateOfJoining: string
  }[]
}

export interface HrRow {
  id: string
  name: string
  employeesCount: number
  createdAt: string
  address?: string | null
  startTime?: string
  endTime?: string
}

export type HrResource = "departments" | "designations" | "branches" | "shifts"

export type PortalSection =
  | "dashboard"
  | "employees"
  | "departments"
  | "designations"
  | "branches"
  | "shifts"
  | "settings"
  | "modules"
  | `feature:${string}`

export function featureSection(key: string): PortalSection {
  return `feature:${key}`
}

export function parseFeatureSection(section: PortalSection): string | null {
  return section.startsWith("feature:") ? section.slice("feature:".length) : null
}
