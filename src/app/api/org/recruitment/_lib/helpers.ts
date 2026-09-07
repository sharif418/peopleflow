// Shared server helpers for /api/org/recruitment routes (Task 3-recruitment owned)
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

// ─── Enums (kept in sync with prisma/schema.prisma comments) ─────────────────

export const JOB_STATUSES = ["open", "on_hold", "closed"] as const
export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"] as const
export const STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const
export const INTERVIEW_MODES = ["onsite", "phone", "video"] as const
export const INTERVIEW_RESULTS = ["pending", "pass", "fail"] as const

/** Pipeline order for sorting (applied first, terminal last). */
export const STAGE_RANK: Record<string, number> = {
  applied: 0,
  screening: 1,
  interview: 2,
  offer: 3,
  hired: 4,
  rejected: 5,
}

/** Allowed forward stage transitions (reject allowed from any non-terminal stage). */
export const STAGE_TRANSITIONS: Record<string, string[]> = {
  applied: ["screening", "rejected"],
  screening: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["hired", "rejected"],
  hired: [],
  rejected: [],
}

export function isTerminalStage(stage: string): boolean {
  return stage === "hired" || stage === "rejected"
}

/** Can `from` move to `to`? */
export function canTransition(from: string, to: string): boolean {
  return (STAGE_TRANSITIONS[from] ?? []).includes(to)
}

// ─── Includes ─────────────────────────────────────────────────────────────────

export const JOB_POSTING_INCLUDE = {
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  _count: { select: { applications: true } },
} satisfies Prisma.JobPostingInclude

export const JOB_APPLICATION_INCLUDE = {
  jobPosting: {
    select: {
      id: true,
      title: true,
      status: true,
      employmentType: true,
      department: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.JobApplicationInclude

export const INTERVIEW_INCLUDE = {
  application: {
    select: { id: true, candidateName: true, stage: true },
  },
} satisfies Prisma.InterviewInclude

// ─── Relation validation (org-scoped) ────────────────────────────────────────

export async function verifyJobRelations(
  orgId: string,
  data: { departmentId?: string | null; designationId?: string | null },
): Promise<string | null> {
  if (data.departmentId) {
    const dept = await db.department.findFirst({
      where: { id: data.departmentId, organizationId: orgId },
      select: { id: true },
    })
    if (!dept) return "invalid_relation_department"
  }
  if (data.designationId) {
    const desig = await db.designation.findFirst({
      where: { id: data.designationId, organizationId: orgId },
      select: { id: true },
    })
    if (!desig) return "invalid_relation_designation"
  }
  return null
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(v: string): boolean {
  if (!ISO_DATE_RE.test(v)) return false
  return !Number.isNaN(new Date(`${v}T00:00:00`).getTime())
}

/** Local midnight ISO (YYYY-MM-DD) of a Date. */
export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function todayIso(): string {
  return isoOf(new Date())
}

/** End-of-local-day Date for an ISO date string (deadline semantics). */
export function endOfDay(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59`)
}

/**
 * Parse a datetime-local string ("YYYY-MM-DDTHH:MM") into a Date (local).
 * Returns null when invalid.
 */
export function parseLocalDateTime(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Count of upcoming (future, pending) interviews for the org. */
export async function upcomingInterviewCount(orgId: string): Promise<number> {
  return db.interview.count({
    where: {
      organizationId: orgId,
      result: "pending",
      scheduledAt: { gte: new Date() },
    },
  })
}
