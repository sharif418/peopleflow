// GET /api/org/expenses/claims — paginated list (12/page), pending-first,
//   filters: status (submitted|approved|rejected|paid), employeeId, category, q
//   + org summary counts (pending, pending amount, approved-this-month amount).
// POST /api/org/expenses/claims — create a submitted claim with line items.
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse, parseBody } from "@/lib/api-utils"
import { audit, isPrismaKnownError } from "../../_lib/helpers"
import {
  EXPENSE_CATEGORIES,
  CLAIM_LIST_INCLUDE,
  CLAIM_DETAIL_INCLUDE,
  allClaimRows,
  claimsSummary,
} from "../_lib/helpers"
import { claimCreateSchema, zodExpenseError } from "../_lib/schemas"

const PAGE_SIZE = 12
const STATUS_VALUES = new Set(["submitted", "approved", "rejected", "paid"])

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const statusParam = (searchParams.get("status") ?? "").trim()
  const employeeId = searchParams.get("employeeId")?.trim() ?? ""
  const category = searchParams.get("category")?.trim() ?? ""
  const q = searchParams.get("q")?.trim() ?? ""
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  const statusList = statusParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => STATUS_VALUES.has(s))

  const where: Prisma.ExpenseClaimWhereInput = { organizationId: guard.org.id }
  if (statusList.length > 0) where.status = { in: statusList }
  if (employeeId) where.employeeId = employeeId
  if (EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
    where.category = category
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      {
        employee: {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { employeeCode: { contains: q } },
          ],
        },
      },
    ]
  }

  try {
    const [rows, summaryRows] = await Promise.all([
      db.expenseClaim.findMany({
        where,
        include: CLAIM_LIST_INCLUDE,
        orderBy: { createdAt: "desc" },
      }),
      allClaimRows(guard.org.id),
    ])

    // Pending first (stable), then createdAt desc (Prisma order preserved within groups).
    const sorted = [
      ...rows.filter((c) => c.status === "submitted"),
      ...rows.filter((c) => c.status !== "submitted"),
    ]
    const total = sorted.length
    const safePage = Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)))
    const items = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

    return ok({
      items,
      total,
      page: safePage,
      pageSize: PAGE_SIZE,
      summary: claimsSummary(summaryRows),
    })
  } catch {
    return fail("list_failed", 500)
  }
}

export async function POST(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const body = await parseBody<Record<string, unknown>>(req)
  if (!body) return fail("bad_json", 400)

  const parsed = claimCreateSchema.safeParse(body)
  if (!parsed.success) return fail(zodExpenseError(parsed.error), 400)
  const data = parsed.data

  const employee = await db.employee.findFirst({
    where: { id: data.employeeId, organizationId: guard.org.id },
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  })
  if (!employee) return fail("invalid_employee", 400)

  const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0)
  if (totalAmount < 1 || totalAmount > 1_000_000_000) return fail("invalid_amount", 400)

  try {
    const created = await db.expenseClaim.create({
      data: {
        organizationId: guard.org.id,
        employeeId: employee.id,
        title: data.title,
        category: data.category,
        expenseDate: data.expenseDate,
        description: data.description ?? null,
        totalAmount,
        status: "submitted",
        items: {
          create: data.items.map((item) => ({
            label: item.label,
            amount: item.amount,
            note: item.note ?? null,
          })),
        },
      },
      include: CLAIM_DETAIL_INCLUDE,
    })
    await audit(
      guard,
      "expense.claimed",
      "expense_claim",
      created.id,
      `${employee.employeeCode} ${employee.firstName} ${employee.lastName} — ${created.title} ৳${totalAmount}`,
    )
    return ok(created, 201)
  } catch (x) {
    if (isPrismaKnownError(x)) return fail("create_failed", 409)
    return fail("create_failed", 500)
  }
}
