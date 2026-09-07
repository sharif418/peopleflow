"use client"

// Wizard step indicator — icon stepper with done/current states, progress bar
// and "step X of Y" label.
import { Briefcase, Check, CheckCircle2, Clock, Network, Sparkles, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

export function StepIndicator({ step, stepCount }: { step: number; stepCount: number }) {
  const { t } = useI18n()

  const stepMeta = [
    { title: t("portal.wizard.step1Title"), icon: Sparkles },
    { title: t("portal.wizard.step2Title"), icon: Network },
    { title: t("portal.wizard.step3Title"), icon: Briefcase },
    { title: t("portal.wizard.step4Title"), icon: Clock },
    { title: t("portal.wizard.step5Title"), icon: Users },
    { title: t("portal.wizard.step6Title"), icon: CheckCircle2 },
  ]

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-1">
        {stepMeta.map((meta, i) => {
          const Icon = meta.icon
          const done = i < step
          const current = i === step
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                  done && "border-success bg-success/15 text-success",
                  current && "border-primary bg-primary/12 text-primary",
                  !done && !current && "border-border bg-muted/40 text-muted-foreground",
                )}
                aria-current={current ? "step" : undefined}
              >
                {done ? <Check className="size-4" aria-hidden /> : <Icon className="size-4.5" aria-hidden />}
              </div>
              <span
                className={cn(
                  "hidden text-center text-[11px] font-medium sm:block",
                  current ? "text-primary" : "text-muted-foreground",
                )}
              >
                {meta.title}
              </span>
            </div>
          )
        })}
      </div>
      <Progress value={((step + 1) / stepCount) * 100} className="mt-4 h-1.5" />
      <p className="mt-2 text-center text-xs text-muted-foreground tabular-nums">
        {t("portal.wizard.stepOf", { current: step + 1, total: stepCount })}
      </p>
    </div>
  )
}
