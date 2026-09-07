// API helpers — response envelope + auth guards for route handlers
import { NextResponse } from "next/server"
import { getSessionContext, type SessionContext } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Organization } from "@prisma/client"

export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ ok: true as const, data }, { status: init ?? 200 })
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false as const, error }, { status })
}

export async function parseBody<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}

export interface Guarded {
  ctx: SessionContext
  org: Organization
}

/** Requires an authenticated SUPER_ADMIN (impersonation NOT active). */
export async function requireSuperAdmin(): Promise<SessionContext | NextResponse> {
  const ctx = await getSessionContext()
  if (!ctx.user) return fail("unauthenticated", 401)
  if (ctx.user.role !== "SUPER_ADMIN" || ctx.impersonating) return fail("forbidden", 403)
  return ctx
}

/** Requires an org context (ORG_ADMIN or SUPER_ADMIN impersonating an org). */
export async function requireOrg(): Promise<Guarded | NextResponse> {
  const ctx = await getSessionContext()
  if (!ctx.user) return fail("unauthenticated", 401)
  if (!ctx.orgId) return fail("no organization context", 403)
  if (ctx.user.role !== "ORG_ADMIN" && !ctx.impersonating) return fail("forbidden", 403)
  const org = await db.organization.findUnique({ where: { id: ctx.orgId } })
  if (!org) return fail("organization not found", 404)
  return { ctx, org }
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse
}

// ─── Provisioning state machine (time-based ERPNext site simulation) ─────────

export interface ProvisionState {
  status: "provisioning" | "active" | "suspended"
  stepIndex: number // 0..6 (6 = done)
  totalSteps: number
  stepsDone: string[]
  progress: number // 0..100
}

const STEP_KEYS = ["site", "frappe", "erpnext", "hrms", "db", "api"]
const STEP_MS = [2000, 4000, 6500, 8500, 10500, 12000]
const PROVISION_TOTAL = 12000

export function computeProvisionState(org: Organization): ProvisionState {
  if (org.status !== "provisioning") {
    return {
      status: org.status as ProvisionState["status"],
      stepIndex: STEP_KEYS.length,
      totalSteps: STEP_KEYS.length,
      stepsDone: STEP_KEYS,
      progress: 100,
    }
  }
  const started = org.provisionStartedAt?.getTime() ?? 0
  const elapsed = Date.now() - started
  let stepIndex = 0
  const stepsDone: string[] = []
  for (let i = 0; i < STEP_MS.length; i++) {
    if (elapsed >= STEP_MS[i]) {
      stepIndex = i + 1
      stepsDone.push(STEP_KEYS[i])
    }
  }
  const progress = Math.min(100, Math.round((elapsed / PROVISION_TOTAL) * 100))
  return {
    status: "provisioning",
    stepIndex,
    totalSteps: STEP_KEYS.length,
    stepsDone,
    progress,
  }
}
