import { NextRequest, NextResponse } from "next/server"
import { getSessionContext } from "@/lib/auth"
import { ok } from "@/lib/api-utils"
import type { MeResponse } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  const ctx = await getSessionContext()
  const data: MeResponse = {
    user: ctx.user,
    org: ctx.org,
    impersonating: ctx.impersonating,
  }
  return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } })
}
