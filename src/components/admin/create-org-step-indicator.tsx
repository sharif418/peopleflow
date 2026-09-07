"use client"

// Create-org wizard step indicator — clickable numbered steps with done state.
import { Check } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const STEP_KEYS = ["step1", "step2", "step3", "step4"] as const

export function CreateOrgStepIndicator({
  step,
  onGoTo,
}: {
  step: number
  onGoTo: (target: number) => void
}) {
  const { t } = useI18n()

  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-4" aria-label={t("admin.createOrg.step", { current: step + 1, total: 4 })}>
      {STEP_KEYS.map((key, i) => (
        <li key={key} className="flex shrink-0 items-center gap-1">
          {i > 0 && <Separator className="mx-1 h-px w-4 bg-border sm:w-8" />}
          <button
            type="button"
            onClick={() => onGoTo(i)}
            className="flex items-center gap-2 rounded-full px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            aria-current={step === i ? "step" : undefined}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
                i < step
                  ? "bg-success text-success-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("hidden whitespace-nowrap sm:inline", step === i ? "text-foreground" : "text-muted-foreground")}>
              {t(`admin.createOrg.${key}`)}
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}
