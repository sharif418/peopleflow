// Create-org wizard form schema, step field map and subdomain slug helper.
import { z } from "zod"

const SUBDOMAIN_RE = /^[a-z0-9-]{3,30}$/

export const createSchema = z.object({
  name: z.string().min(2),
  subdomain: z.string().regex(SUBDOMAIN_RE),
  planKey: z.enum(["starter", "growth", "enterprise"]),
  adminName: z.string().min(2),
  adminEmail: z.email(),
  adminPassword: z.string().min(6),
})

export type CreateForm = z.infer<typeof createSchema>

export const STEP_FIELDS: (keyof CreateForm)[][] = [
  ["name", "subdomain"],
  ["planKey"],
  ["adminName", "adminEmail", "adminPassword"],
]

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
