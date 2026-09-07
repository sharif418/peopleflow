// GET /api/admin/audit-logs?page=&pageSize=&q=&organizationId= — paginated audit trail
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, fail, requireSuperAdmin, isResponse } from "@/lib/api-utils"

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin()
  if (isResponse(guard)) return guard

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20))
  const q = (searchParams.get("q") ?? "").trim()
  const organizationId = (searchParams.get("organizationId") ?? "").trim()

  try {
    const where = {
      ...(organizationId ? { organizationId } : {}),
      ...(q
        ? {
            OR: [
              { actor: { contains: q } },
              { action: { contains: q } },
              { details: { contains: q } },
            ],
          }
        : {}),
    }

    const [total, items, orgs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { organization: { select: { name: true } } },
      }),
      db.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ])

    return ok({
      items: items.map((log) => ({
        id: log.id,
        actor: log.actor,
        action: log.action,
        details: log.details,
        createdAt: log.createdAt.toISOString(),
        organizationName: log.organization?.name ?? null,
      })),
      total,
      page,
      pageSize,
      organizations: orgs,
    })
  } catch {
    return fail("failed to load audit logs", 500)
  }
}
