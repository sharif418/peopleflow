"use client"

// Wizard step 2 — designations chip list.
import { useI18n } from "@/lib/i18n"
import { ChipsStep } from "../chips-step"

export function DesignationsStep({
  items,
  onChange,
}: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{t("portal.wizard.step3Title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("portal.wizard.step3Desc")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{t("portal.wizard.step3Hint")}</p>
      </div>
      <ChipsStep
        items={items}
        onChange={onChange}
        itemPh={t("portal.wizard.itemPh")}
        addLabel={t("portal.wizard.addItem")}
        emptyHint={t("portal.wizard.emptyList")}
      />
    </div>
  )
}
