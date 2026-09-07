// Recruitment module API types + query keys + endpoints (Task 3-recruitment owned)
import type { HrRow } from "@/components/portal/types"

// ─── API response types (mirror the route shapes) ─────────────────────────────

export interface JobPostingRow {
  id: string
  organizationId: string
  title: string
  departmentId: string | null
  designationId: string | null
  employmentType: string // full_time | part_time | contract | intern
  vacancies: number
  status: string // open | on_hold | closed
  description: string | null
  postedAt: string
  closesAt: string | null
  createdAt: string
  updatedAt: string
  department: { id: string; name: string } | null
  designation: { id: string; name: string } | null
  _count: { applications: number }
}

export interface JobPostingDetail extends JobPostingRow {
  applications: {
    id: string
    candidateName: string
    candidatePhone: string | null
    candidateEmail: string | null
    expectedSalary: number | null
    stage: string
    rating: number
    createdAt: string
  }[]
}

export interface JobApplicationRow {
  id: string
  organizationId: string
  jobPostingId: string
  candidateName: string
  candidateEmail: string | null
  candidatePhone: string | null
  expectedSalary: number | null
  coverNote: string | null
  stage: string // applied | screening | interview | offer | hired | rejected
  rating: number
  notes: string | null
  createdAt: string
  updatedAt: string
  jobPosting: {
    id: string
    title: string
    status: string
    employmentType: string
    department: { id: string; name: string } | null
  }
}

export interface InterviewRow {
  id: string
  organizationId: string
  applicationId: string
  round: number
  mode: string // onsite | phone | video
  scheduledAt: string
  interviewer: string | null
  feedback: string | null
  result: string // pending | pass | fail
  createdAt: string
}

export interface ApplicationDetail extends JobApplicationRow {
  interviews: InterviewRow[]
}

export interface ApplicationsSummary {
  openJobs: number
  activePipeline: number
  upcomingInterviews: number
  hired: number
}

export interface ApplicationsData {
  items: JobApplicationRow[]
  total: number
  page: number
  pageSize: number
  summary: ApplicationsSummary
}

export interface JobsData {
  items: JobPostingRow[]
}

export interface InterviewsData {
  items: InterviewRow[]
}

export type DepartmentOption = HrRow

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface JobsFilters {
  status: string
  q: string
  departmentId: string
}

export interface ApplicationsFilters {
  stage: string
  jobPostingId: string
  q: string
  page: number
}

export const DEFAULT_APPLICATION_FILTERS: ApplicationsFilters = {
  stage: "",
  jobPostingId: "",
  q: "",
  page: 1,
}

export const DEFAULT_JOBS_FILTERS: JobsFilters = {
  status: "",
  q: "",
  departmentId: "",
}

export const APPLICATION_STAGES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const

export const JOB_STATUS_VALUES = ["open", "on_hold", "closed"] as const

/** Next stage in the forward pipeline; null for terminal stages. */
export const NEXT_STAGE: Record<string, string | null> = {
  applied: "screening",
  screening: "interview",
  interview: "offer",
  offer: "hired",
  hired: null,
  rejected: null,
}

// ─── Endpoints + query keys ───────────────────────────────────────────────────

export const RECRUITMENT_ENDPOINTS = {
  jobs: "/api/org/recruitment/jobs",
  jobItem: (id: string) => `/api/org/recruitment/jobs/${id}`,
  applications: "/api/org/recruitment/applications",
  applicationItem: (id: string) => `/api/org/recruitment/applications/${id}`,
  interviews: (id: string) => `/api/org/recruitment/applications/${id}/interviews`,
  interviewItem: (id: string, interviewId: string) =>
    `/api/org/recruitment/applications/${id}/interviews/${interviewId}`,
  departments: "/api/org/departments",
} as const

export const recruitmentKeys = {
  all: ["org", "recruitment"] as const,
  jobs: (filters: JobsFilters) => ["org", "recruitment", "jobs", filters] as const,
  jobDetail: (id: string) => ["org", "recruitment", "job", id] as const,
  applications: (filters: ApplicationsFilters) => ["org", "recruitment", "applications", filters] as const,
  applicationDetail: (id: string) => ["org", "recruitment", "application", id] as const,
}

/** Invalidate everything recruitment-related (used after mutations). */
export const RECRUITMENT_QUERY_PREFIX = ["org", "recruitment"] as const
