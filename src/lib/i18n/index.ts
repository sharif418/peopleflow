// Lightweight i18n — nested dictionaries, bn/en, param interpolation {name}
import { useCallback } from "react"
import { bn } from "./bn"
import { en } from "./en"
import { bnAdmin } from "./bn-admin"
import { enAdmin } from "./en-admin"
import { bnPortal } from "./bn-portal"
import { enPortal } from "./en-portal"
import { useSessionStore } from "@/store/session"
import type { Lang } from "@/lib/types"

type Dict = Record<string, unknown>

const dictionaries: Record<Lang, Record<string, Dict>> = {
  bn: { ...bn, admin: bnAdmin, portal: bnPortal },
  en: { ...en, admin: enAdmin, portal: enPortal },
}

function resolve(dict: Record<string, Dict> | unknown, path: string[]): unknown {
  let current: unknown = dict
  for (const key of path) {
    if (current && typeof current === "object" && key in (current as Dict)) {
      current = (current as Dict)[key]
    } else {
      return undefined
    }
  }
  return current
}

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const path = key.split(".")
  const primary = resolve(dictionaries[lang], path)
  const fallback = resolve(dictionaries[lang === "bn" ? "en" : "bn"], path)
  const raw = typeof primary === "string" ? primary : typeof fallback === "string" ? fallback : key
  if (params) {
    return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
      params[name] !== undefined ? String(params[name]) : `{${name}}`,
    )
  }
  return raw
}

export function useI18n() {
  const lang = useSessionStore((s) => s.lang)
  const setLang = useSessionStore((s) => s.setLang)

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  )

  return { lang, setLang, t }
}

export type TranslateFn = ReturnType<typeof useI18n>["t"]
