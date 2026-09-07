// Shared server helpers for /api/org/expenses routes (Task 3-expenses owned)
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

// ─── Categories (schema mirrors ExpenseClaim.category) ───────────────────────

export const EXPENSE_CATEGORIES = [
  "travel",
  "food",
  "office_supplies",
  "client_entertainment",
  "utilities",
  "training",
  "other",
] as const

export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number]

// ─── Prisma includes ──────────────────────────────────────────────────────────

export const CLAIM_EMPLOYEE_SELECT = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  designation: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeSelect

/** List include: claim + employee + item count (items lazy-loaded on detail). */
export const CLAIM_LIST_INCLUDE = {
  employee: { select: CLAIM_EMPLOYEE_SELECT },
  _count: { select: { items: true } },
} satisfies Prisma.ExpenseClaimInclude

/** Detail include: claim + employee + full line items. */
export const CLAIM_DETAIL_INCLUDE = {
  employee: { select: CLAIM_EMPLOYEE_SELECT },
  items: true,
} satisfies Prisma.ExpenseClaimInclude

// ─── Review state machine ─────────────────────────────────────────────────────
// submitted → approved | rejected (approve / reject)
// approved  → paid (mark_paid)
// Everything else is rejected with a machine-readable code.

export type ClaimAction = "approve" | "reject" | "mark_paid"

const ACTION_TARGET: Record<ClaimAction, string> = {
  approve: "approved",
  reject: "rejected",
  mark_paid: "paid",
}

export function resolveTransition(action: ClaimAction, status: string): string | null {
  if ((action === "approve" || action === "reject") && status === "submitted") {
    return ACTION_TARGET[action]
  }
  if (action === "mark_paid" && status === "approved") return "paid"
  return null
}

/** Error code for an invalid action on the claim's current status. */
export function transitionErrorCode(action: ClaimAction): string {
  return action === "mark_paid" ? "not_approved" : "not_submitted"
}

// ─── Summary math ─────────────────────────────────────────────────────────────

function sameLocalMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/**
 * Org-wide summary for the claims inbox:
 * pending count, pending amount (৳), approved-this-month amount (৳), total claims.
 * Approved-this-month sums claims reviewed (approved/paid) in the current month.
 */
export function claimsSummary(
  claims: { status: string; totalAmount: number; reviewedAt: Date | null }[],
): { pending: number; pendingAmount: number; approvedMonthAmount: number; totalClaims: number } {
  const now = new Date()
  let pending = 0
  let pendingAmount = 0
  let approvedMonthAmount = 0
  for (const c of claims) {
    if (c.status === "submitted") {
      pending++
      pendingAmount += c.totalAmount
    }
    if ((c.status === "approved" || c.status === "paid") && c.reviewedAt && sameLocalMonth(c.reviewedAt, now)) {
      approvedMonthAmount += c.totalAmount
    }
  }
  return { pending, pendingAmount, approvedMonthAmount, totalClaims: claims.length }
}

/** Minimal claim rows (status/total/reviewedAt) for the org-wide summary. */
export async function allClaimRows(orgId: string) {
  return db.expenseClaim.findMany({
    where: { organizationId: orgId },
    select: { status: true, totalAmount: true, reviewedAt: true },
  })
}
