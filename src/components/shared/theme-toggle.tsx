"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useI18n()

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9 rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("common.lightMode") : t("common.darkMode")}
      title={isDark ? t("common.lightMode") : t("common.darkMode")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
