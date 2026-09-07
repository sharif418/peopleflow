// Client-side response types for /api/admin/* endpoints
import type { OrganizationSummary } from "@/lib/types"
import type { ProvisionState } from "@/lib/api-utils"

export interface OrgRow extends OrganizationSummary {
  provision: ProvisionState
}

export interface StatsResponse {
  orgsTotal: number
  orgsActive: number
  orgsSuspended: number
  orgsProvisioning: number
  employeesTotal: number
  mrr: number
  arr: number
  revenueByMonth: { period: string; amount: number }[]
  orgsByPlan: { planKey: string; count: number }[]
  orgsCreatedTrend: { period: string; count: number }[]
  recentOrgs: OrganizationSummary[]
  recentActivity: {
    id: string
    actor: string
    action: string
    details: string | null
    createdAt: string
  }[]
}

export interface OrgDetailResponse {
  org: OrganizationSummary
  provision: ProvisionState
  adminUser: { name: string; email: string } | null
  employeesCount: number
  featureFlags: Record<string, boolean>
}

export interface PlanResponse {
  key: string
  nameBn: string
  nameEn: string
  priceBdt: number
  maxEmployees: number
  features: string[]
  taglineBn: string
  taglineEn: string
  highlight: boolean
  orgsCount: number
}

export interface HealthResponse {
  engine: "mock" | "erpnext"
  uptimePercent: number
  metrics: {
    key: string
    label: string
    value: number
    unit: string
    series: number[]
  }[]
  sites: {
    orgName: string
    siteName: string
    status: string
    latencyMs: number
    version: string
    lastCheck: string
  }[]
  app: {
    node: string
    nextjs: string
    db: string
    time: string
  }
}

export interface AuditPageResponse {
  items: {
    id: string
    actor: string
    action: string
    details: string | null
    createdAt: string
    organizationName: string | null
  }[]
  total: number
  page: number
  pageSize: number
  organizations: { id: string; name: string }[]
}

export interface CreateOrgResponse extends OrganizationSummary {
  provision: ProvisionState
}
