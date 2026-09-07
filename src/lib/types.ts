// Shared API/UI types
export type Role = "SUPER_ADMIN" | "ORG_ADMIN"
export type Lang = "bn" | "en"
export type OrgStatus = "provisioning" | "active" | "suspended"

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
}

export interface SessionOrg {
  id: string
  name: string
  subdomain: string
  siteName: string | null
  status: OrgStatus
  planKey: string
  setupCompleted: boolean
  featureFlags: Record<string, boolean>
}

export interface MeResponse {
  user: SessionUser | null
  org: SessionOrg | null
  impersonating: boolean
}

export interface OrganizationSummary {
  id: string
  name: string
  subdomain: string
  siteName: string | null
  status: OrgStatus
  planKey: string
  setupCompleted: boolean
  employeesCount: number
  usersCount: number
  mrr: number
  createdAt: string
  provisionStartedAt: string | null
}

export interface ApiOk<T> {
  ok: true
  data: T
}

export interface ApiErr {
  ok: false
  error: string
}

export type ApiEnvelope<T> = ApiOk<T> | ApiErr
