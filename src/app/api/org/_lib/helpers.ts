// Shared server helpers for /api/org routes (portal agent owned)
import { db } from "@/lib/db"
import type { Guarded } from "@/lib/api-utils"

export type EmployeeRelationKey = "departmentId" | "designationId" | "branchId" | "shiftId"

/** Generate the next sequential employee code `PF-XXXX` for an org. */
export async function nextEmployeeCode(organizationId: string): Promise<string> {
  const rows = await db.employee.findMany({
    where: { organizationId },
    select: { employeeCode: true },
  })
  let max = 0
  for (const r of rows) {
    const m = /^PF-(\d+)$/.exec(r.employeeCode)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `PF-${String(max + 1).padStart(4, "0")}`
}

/**
 * Verify that relation ids (department/designation/branch/shift) belong to the org.
 * Returns an error code like `invalid_relation_department` or null when all valid.
 */
export async function verifyRelations(
  orgId: string,
  data: Partial<Record<EmployeeRelationKey, string | null | undefined>>,
): Promise<string | null> {
  const checks: { key: EmployeeRelationKey; model: "department" | "designation" | "branch" | "shift" }[] = [
    { key: "departmentId", model: "department" },
    { key: "designationId", model: "designation" },
    { key: "branchId", model: "branch" },
    { key: "shiftId", model: "shift" },
  ]
  for (const c of checks) {
    const id = data[c.key]
    if (id === undefined || id === null || id === "") continue
    let exists = false
    if (c.model === "department") {
      exists = !!(await db.department.findFirst({ where: { id, organizationId: orgId }, select: { id: true } }))
    } else if (c.model === "designation") {
      exists = !!(await db.designation.findFirst({ where: { id, organizationId: orgId }, select: { id: true } }))
    } else if (c.model === "branch") {
      exists = !!(await db.branch.findFirst({ where: { id, organizationId: orgId }, select: { id: true } }))
    } else {
      exists = !!(await db.shift.findFirst({ where: { id, organizationId: orgId }, select: { id: true } }))
    }
    if (!exists) return `invalid_relation_${c.model}`
  }
  return null
}

/** Write an audit log row for a portal mutation. */
export async function audit(
  guard: Guarded,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: string,
): Promise<void> {
  await db.auditLog.create({
    data: {
      organizationId: guard.org.id,
      actor: guard.ctx.user?.email ?? "unknown",
      action,
      targetType,
      targetId,
      details,
    },
  })
}

/** Prisma employee include used for list/create/update responses. */
export const EMPLOYEE_INCLUDE = {
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  shift: { select: { id: true, name: true } },
} as const

export function isPrismaKnownError(x: unknown): x is { code: string } {
  return typeof x === "object" && x !== null && "code" in x && typeof (x as { code: unknown }).code === "string"
}
