// Payroll API response types (mirror of /api/org/payroll + /api/org/settings shapes)
export interface PayrollOverviewStats {
  employees: number
  totalGross: number
  totalNet: number
  totalPf: number
  statusBreakdown: { draft: number; confirmed: number; paid: number }
  generatedCount: number
}

export interface RecentSlip {
  employeeCode: string
  employeeName: string
  gross: number
  netPay: number
  status: string
}

export interface PayrollOverviewData {
  period: string
  periods: string[]
  stats: PayrollOverviewStats
  recentSlips: RecentSlip[]
}

export interface StructureComponent {
  id: string
  name: string
  abbr: string
  type: string // earning | deduction
  calcType: string // percent | fixed
  value: number
}

export interface SalaryStructureRow {
  id: string
  name: string
  isDefault: boolean
  createdAt: string
  payslipsCount: number
  components: StructureComponent[]
}

export interface PayslipListEmployee {
  id: string
  code: string
  firstName: string
  lastName: string
  designation: string | null
}

export interface PayslipListRow {
  id: string
  period: string
  gross: number
  netPay: number
  status: string // draft | confirmed | paid
  pfEmployee: number
  structureId: string | null
  employee: PayslipListEmployee
}

export interface PayslipsPage {
  items: PayslipListRow[]
  total: number
  page: number
  pageSize: number
}

export interface PayslipItemRow {
  id: string
  label: string
  type: string
  amount: number
}

export interface PayslipDetailData {
  id: string
  period: string
  gross: number
  totalEarnings: number
  totalDeductions: number
  netPay: number
  pfEmployee: number
  pfEmployer: number
  status: string
  createdAt: string
  structure: { id: string; name: string } | null
  employee: {
    id: string
    code: string
    firstName: string
    lastName: string
    designation: string | null
    department: string | null
    dateOfJoining: string
  }
  items: PayslipItemRow[]
  org: {
    name: string
    address: string | null
    pfEnabled: boolean
    pfPercent: number
  }
}

export interface GenerateResult {
  period: string
  structure: string | null
  generated: number
  skipped: number
  total: number
}

export interface OrgSettingsData {
  name: string
  subdomain: string
  address: string | null
  contactPhone: string | null
  contactEmail: string | null
  weekendConfig: string[]
  pfEnabled: boolean
  pfPercent: number
  planKey: string
  employeeCount: number
  setupCompleted: boolean
  createdAt: string
}

export type PayslipAction = "confirm" | "mark_paid" | "revert_draft"

export interface ComponentFormRow {
  name: string
  abbr: string
  type: string
  calcType: string
  value: string
}
