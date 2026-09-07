"use client"

// Shared logout hook — clears session server-side, then routes to /login
import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSessionStore } from "@/store/session"

export function useLogout() {
  const router = useRouter()
  const logout = useSessionStore((s) => s.logout)

  return useCallback(async () => {
    await logout()
    router.push("/login")
    router.refresh()
  }, [logout, router])
}
