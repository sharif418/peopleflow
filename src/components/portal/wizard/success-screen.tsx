"use client"

// Wizard success screen — shown after the setup payload is saved, while the
// session refresh flips org.setupCompleted.
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"

export function SuccessScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-12 text-center sm:py-16">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="flex size-20 items-center justify-center rounded-full bg-success/15 text-success"
      >
        <CheckCircle2 className="size-10" aria-hidden />
      </motion.div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("portal.wizard.successTitle")}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("portal.wizard.successDesc")}</p>
      </div>
      <Button size="lg" className="h-12 px-8" onClick={onDone}>
        {t("portal.wizard.goDashboard")}
        <ArrowRight className="size-4" aria-hidden />
      </Button>
    </div>
  )
}
