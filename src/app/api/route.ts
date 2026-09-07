import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Platform health endpoint
export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      service: "peopleflow",
      version: "2.0.0-phase1",
      frontend: "nextjs-16",
      backendEngine: process.env.ERPNEXT_BASE_URL ? "erpnext" : "mock",
      time: new Date().toISOString(),
    },
  })
}
