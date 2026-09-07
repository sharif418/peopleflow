// Portal query keys + API paths + error-code mapping
import type { HrResource } from "./types"

export const orgKeys = {
  overview: ["org", "overview"] as const,
  employees: (filters: { q: string; departmentId: string; status: string; page: number }) =>
    ["org", "employees", filters] as const,
  hr: (resource: HrResource) => ["org", resource] as const,
}

export const HR_ENDPOINTS: Record<HrResource, string> = {
  departments: "/api/org/departments",
  designations: "/api/org/designations",
  branches: "/api/org/branches",
  shifts: "/api/org/shifts",
}

/** Map server error codes to a human message. Returns null for unknown codes. */
export function knownApiError(
  err: unknown,
  map: Partial<Record<string, string>>,
): { matched: boolean; message: string } {
  const code = err instanceof Error ? err.message : String(err)
  if (code in map) return { matched: true, message: map[code] ?? code }
  return { matched: false, message: code }
}
