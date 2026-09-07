// Performance module API types + query keys + endpoints (Task 3-performance owned)
export type GoalStatus = "active" | "completed" | "cancelled"
export type AppraisalStatus = "draft" | "in_review" | "final"

export interface GoalEmployee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  designation: { id: string; name: string } | null
  department: { id: string; name: string } | null
}

export interface GoalRow {
  id: string
  employeeId: string
  title: string
  description: string | null
  unit: string
  targetValue: number
  currentValue: number
  startDate: string
  dueDate: string
  weight: number
  status: string
  createdAt: string
  updatedAt: string
  employee: GoalEmployee
  progressPercent: number
  isOverdue: boolean
  isDueSoon: boolean
  daysRemaining: number
  autoCompleted?: boolean
}

export interface GoalsSummary {
  active: number
  completed: number
  cancelled: number
  overdue: number
  avgProgressPercent: number
}

export interface GoalsData {
  items: GoalRow[]
  total: number
  today: string
  summary: GoalsSummary
}

export interface GoalFilters {
  status: string
  employeeId: string
  q: string
}

export interface AppraisalItemRow {
  id: string
  appraisalId: string
  criterion: string
  score: number
  comment: string | null
}

export interface AppraisalRow {
  id: string
  employeeId: string
  period: string
  overallScore: number
  status: string
  reviewerNote: string | null
  selfNote: string | null
  createdAt: string
  updatedAt: string
  employee: GoalEmployee
  items: AppraisalItemRow[]
}

export interface AppraisalsSummary {
  draft: number
  inReview: number
  final: number
  avgFinalScore: number
}

export interface AppraisalsData {
  items: AppraisalRow[]
  total: number
  page: number
  pageSize: number
  summary: AppraisalsSummary
}

export interface AppraisalFilters {
  status: string
  employeeId: string
  q: string
  page: number
}

export type AppraisalAction = "submit" | "finalize"

export const PERFORMANCE_ENDPOINTS = {
  goals: "/api/org/performance/goals",
  goalItem: (id: string) => `/api/org/performance/goals/${id}`,
  appraisals: "/api/org/performance/appraisals",
  appraisalItem: (id: string) => `/api/org/performance/appraisals/${id}`,
} as const

export const performanceKeys = {
  all: ["org", "performance"] as const,
  goals: (filters: GoalFilters) => ["org", "performance", "goals", filters] as const,
  appraisals: (filters: AppraisalFilters) => ["org", "performance", "appraisals", filters] as const,
  appraisalDetail: (id: string) => ["org", "performance", "appraisal", id] as const,
}

/** Default goal filters (also drive the module stats row). */
export const DEFAULT_GOAL_FILTERS: GoalFilters = { status: "", employeeId: "", q: "" }

export const DEFAULT_APPRAISAL_FILTERS: AppraisalFilters = {
  status: "",
  employeeId: "",
  q: "",
  page: 1,
}

/** Goal unit options (matches the server zod enum). */
export const GOAL_UNIT_OPTIONS = [
  { value: "%", key: "portal.performance.units.percent" },
  { value: "টাকা", key: "portal.performance.units.taka" },
  { value: "ইউনিট", key: "portal.performance.units.units" },
] as const

/** The 5 fixed appraisal criteria in display order. */
export const APPRAISAL_CRITERIA = [
  "quality",
  "punctuality",
  "teamwork",
  "leadership",
  "goal_achievement",
] as const

export type AppraisalCriterion = (typeof APPRAISAL_CRITERIA)[number]
