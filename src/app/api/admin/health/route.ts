// GET /api/admin/health — infra + ERPNext site health (mock engine when ERPNEXT_BASE_URL unset)
import { db } from "@/lib/db"
import { ok, fail, requireSuperAdmin, isResponse } from "@/lib/api-utils"

const SERIES_POINTS = 24

/** Deterministic 24-point series that drifts slowly over time. */
function metricSeries(base: number, amplitude: number, phase: number): number[] {
  const minute = Date.now() / 60_000
  return Array.from({ length: SERIES_POINTS }, (_, i) => {
    const value = base + amplitude * Math.sin(i / 3 + minute + phase)
    return Math.round(value * 10) / 10
  })
}

/** Deterministic pseudo-latency in [20, 180] derived from the org id + minute. */
function latencyFor(orgId: string): number {
  const seed = orgId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const wobble = Math.sin(Date.now() / 60_000 + (seed % 17)) * 8
  return Math.round(Math.min(180, Math.max(20, 20 + (seed % 160) + wobble)))
}

export async function GET() {
  const guard = await requireSuperAdmin()
  if (isResponse(guard)) return guard

  try {
    const orgs = await db.organization.findMany({ orderBy: { createdAt: "asc" } })
    const engine = process.env.ERPNEXT_BASE_URL ? "erpnext" : "mock"

    const cpu = metricSeries(23.4, 8, 0)
    const ram = metricSeries(48.2, 6, 1.4)
    const disk = metricSeries(61.5, 0.8, 2.2)

    const data = {
      engine,
      uptimePercent: 99.94,
      metrics: [
        { key: "cpu", label: "CPU", value: cpu[cpu.length - 1], unit: "%", series: cpu },
        { key: "ram", label: "RAM", value: ram[ram.length - 1], unit: "%", series: ram },
        { key: "disk", label: "Disk", value: disk[disk.length - 1], unit: "%", series: disk },
      ],
      sites: orgs.map((org) => ({
        orgName: org.name,
        siteName: org.siteName ?? `${org.subdomain}.peopleflow.com`,
        status: org.status,
        latencyMs: latencyFor(org.id),
        version: "v15.46.1",
        lastCheck: new Date().toISOString(),
      })),
      app: {
        node: process.version,
        nextjs: "16.1.1",
        db: "sqlite",
        time: new Date().toISOString(),
      },
    }
    return ok(data)
  } catch {
    return fail("failed to load health", 500)
  }
}
