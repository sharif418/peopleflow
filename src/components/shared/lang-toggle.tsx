"use client"

import { Languages } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { Lang } from "@/lib/types"

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n()

  const options: { value: Lang; label: string }[] = [
    { value: "bn", label: "বাং" },
    { value: "en", label: "EN" },
  ]

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex h-9 items-center rounded-full border border-border bg-card p-0.5 shadow-xs",
        className,
      )}
    >
      <Languages className="mx-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLang(opt.value)}
          aria-pressed={lang === opt.value}
          className={cn(
            "h-7 min-w-9 rounded-full px-2 text-xs font-semibold transition-colors",
            lang === opt.value
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
