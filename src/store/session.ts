"use client"

// Global client state: session + language (navigation is handled by the App Router)
import { create } from "zustand"
import type { Lang, MeResponse, SessionOrg, SessionUser } from "@/lib/types"

interface SessionState {
  status: "loading" | "authenticated" | "unauthenticated"
  user: SessionUser | null
  org: SessionOrg | null
  impersonating: boolean
  lang: Lang
  langHydrated: boolean

  setLang: (lang: Lang) => void
  hydrateLang: () => void
  setSession: (user: SessionUser, org: SessionOrg | null, impersonating: boolean) => void
  clearSession: () => void
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const LANG_KEY = "peopleflow.lang"

export const useSessionStore = create<SessionState>((set, get) => ({
  status: "loading",
  user: null,
  org: null,
  impersonating: false,
  lang: "bn",
  langHydrated: false,

  setLang: (lang) => {
    set({ lang })
    try {
      window.localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "bn" ? "bn" : "en"
    }
  },

  hydrateLang: () => {
    if (get().langHydrated) return
    try {
      const stored = window.localStorage.getItem(LANG_KEY)
      if (stored === "bn" || stored === "en") {
        set({ lang: stored })
        document.documentElement.lang = stored === "bn" ? "bn" : "en"
      }
    } catch {
      /* ignore */
    }
    set({ langHydrated: true })
  },

  setSession: (user, org, impersonating) =>
    set({ status: "authenticated", user, org, impersonating }),

  clearSession: () =>
    set({ status: "unauthenticated", user: null, org: null, impersonating: false }),

  refresh: async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" })
      const json = (await res.json()) as { ok: boolean; data?: MeResponse }
      if (json.ok && json.data && json.data.user) {
        set({
          status: "authenticated",
          user: json.data.user,
          org: json.data.org,
          impersonating: json.data.impersonating,
        })
      } else {
        set({ status: "unauthenticated", user: null, org: null, impersonating: false })
      }
    } catch {
      set({ status: "unauthenticated", user: null, org: null, impersonating: false })
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      /* ignore */
    }
    get().clearSession()
  },
}))
