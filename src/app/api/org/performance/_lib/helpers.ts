// Shared server helpers for /api/org/performance routes (Task 3-performance owned)
import type { Prisma } from "@prisma/client"

// ─── Prisma includes ─────────────────────────────────────────────────────────

export const GOAL_INCLUDE = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      designation: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.GoalInclude

export const APPRAISAL_INCLUDE = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      designation: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  },
  items: true,
} satisfies Prisma.AppraisalInclude

export type GoalWithEmployee = Prisma.GoalGetPayload<{ include: typeof GOAL_INCLUDE }>
export type AppraisalWithItems = Prisma.AppraisalGetPayload<{ include: typeof APPRAISAL_INCLUDE }>

// ─── ISO date helpers (local timezone, YYYY-MM-DD) ───────────────────────────

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(v: string): boolean {
  if (!ISO_RE.test(v)) return false
  return !Number.isNaN(new Date(`${v}T00:00:00`).getTime())
}

/** Local-calendar ISO date (YYYY-MM-DD) of a Date. */
export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function todayIso(): string {
  return isoOf(new Date())
}

/** Whole days between two ISO dates (b − a); negative when b is before a. */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00`).getTime()
  const b = new Date(`${toIso}T00:00:00`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / 86_400_000)
}

// ─── Goal computed fields ─────────────────────────────────────────────────────

/** Progress 0..100 (rounded), clamped — a 0 target means 0% by convention. */
export function goalProgressPercent(targetValue: number, currentValue: number): number {
  if (targetValue <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((currentValue / targetValue) * 100)))
}

/** Overdue = still active with a dueDate before today. */
export function isGoalOverdue(status: string, dueDate: string, today: string): boolean {
  return status === "active" && dueDate < today
}

/** Due-soon = active, not overdue, due within the next 7 days. */
export function isGoalDueSoon(status: string, dueDate: string, today: string): boolean {
  if (status !== "active" || dueDate < today) return false
  return daysBetween(today, dueDate) <= 7
}

/** Goal row with UI-facing computed fields (progress, flags, days remaining). */
export function goalComputedRow(goal: GoalWithEmployee, today = todayIso()) {
  return {
    ...goal,
    progressPercent: goalProgressPercent(goal.targetValue, goal.currentValue),
    isOverdue: isGoalOverdue(goal.status, goal.dueDate, today),
    isDueSoon: isGoalDueSoon(goal.status, goal.dueDate, today),
    daysRemaining: daysBetween(today, goal.dueDate),
  }
}

// ─── Appraisal criteria + score math ─────────────────────────────────────────

/** The 5 fixed appraisal criteria (canonical display order). */
export const APPRAISAL_CRITERIA = [
  "quality",
  "punctuality",
  "teamwork",
  "leadership",
  "goal_achievement",
] as const

export type AppraisalCriterion = (typeof APPRAISAL_CRITERIA)[number]

const CRITERION_ORDER: Record<string, number> = Object.fromEntries(
  APPRAISAL_CRITERIA.map((c, i) => [c, i]),
)

/** Sort appraisal items into the canonical criterion order. */
export function orderAppraisalItems<T extends { criterion: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (CRITERION_ORDER[a.criterion] ?? 99) - (CRITERION_ORDER[b.criterion] ?? 99),
  )
}

/** Weighted average of item scores → overall 1..5 (2-decimal, 0 when empty). */
export function computeOverallScore(scores: number[]): number {
  if (scores.length === 0) return 0
  const sum = scores.reduce((acc, s) => acc + s, 0)
  return Math.round((sum / scores.length) * 100) / 100
}
