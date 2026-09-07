// GET /api/org/payroll/payslips?period=&status=&q=&page= — paginated (12/page)
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, fail, requireOrg, isResponse } from "@/lib/api-utils"
import { currentPeriod, isPeriodKey } from "../_lib/payroll"

const PAGE_SIZE = 12
const STATUS_VALUES = new Set(["draft", "confirmed", "paid"])

export async function GET(req: Request) {
  const guard = await requireOrg()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const rawPeriod = searchParams.get("period")?.trim() ?? ""
  const period = rawPeriod && isPeriodKey(rawPeriod) ? rawPeriod : currentPeriod()
  const status = searchParams.get("status")?.trim() ?? ""
  const q = searchParams.get("q")?.trim() ?? ""
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  const where: Prisma.PayslipWhereInput = { organizationId: guard.org.id, period }
  if (STATUS_VALUES.has(status)) where.status = status
  if (q) {
    where.employee = {
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { employeeCode: { contains: q } },
      ],
    }
  }

  try {
    const [items, total] = await Promise.all([
      db.payslip.findMany({
        where,
        orderBy: { employee: { employeeCode: "asc" } },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              designation: { select: { name: true } },
            },
          },
        },
      }),
      db.payslip.count({ where }),
    ])

    return ok({
      items: items.map((s) => ({
        id: s.id,
        period: s.period,
        gross: s.gross,
        netPay: s.netPay,
        status: s.status,
        pfEmployee: s.pfEmployee,
        structureId: s.structureId,
        employee: {
          id: s.employee.id,
          code: s.employee.employeeCode,
          firstName: s.employee.firstName,
          lastName: s.employee.lastName,
          designation: s.employee.designation?.name ?? null,
        },
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
    })
  } catch {
    return fail("list_failed", 500)
  }
}
