"use client"

// Dynamic line-items editor (label + amount ৳ + note) with add/remove rows
// and a live total preview. Lives inside ClaimFormDialog's RHF context.
import { useFormContext, useFieldArray, useWatch } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { formatBdt } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { FormValues } from "./claim-form-dialog"

const EMPTY_ITEM = { label: "", amount: "", note: "" }

function isValidAmount(v: string): boolean {
  const n = Number(v)
  return v.trim() !== "" && Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 10_000_000
}

export function ItemsEditor() {
  const { t, lang } = useI18n()
  const form = useFormContext<FormValues>()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })
  const items = useWatch({ control: form.control, name: "items" }) ?? []
  const errors = form.formState.errors.items

  const total = items.reduce((sum, item) => (isValidAmount(item.amount) ? sum + Number(item.amount) : sum), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t("portal.expense.create.itemsTitle")}</p>
        <p className="text-xs text-muted-foreground">
          {t("portal.expense.claims.itemsCount", { n: fields.length })}
        </p>
      </div>

      <div className="space-y-2">
        {typeof errors?.message === "string" && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.message}
          </p>
        )}
        {fields.map((field, i) => {
          const message = errors?.[i]?.label?.message ?? errors?.[i]?.amount?.message ?? errors?.[i]?.note?.message
          return (
            <div key={field.id} className="space-y-2 rounded-lg border border-border/80 bg-muted/30 p-3">
              <div className="flex gap-2">
                <Input
                  aria-label={`${t("portal.expense.review.itemLabel")} ${i + 1}`}
                  placeholder={t("portal.expense.create.itemLabelPh")}
                  className="h-10"
                  maxLength={80}
                  {...form.register(`items.${i}.label`)}
                />
                <Input
                  aria-label={`${t("portal.expense.review.itemAmount")} ${i + 1}`}
                  placeholder={t("portal.expense.create.itemAmountPh")}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  className="h-10 w-32 text-right tabular-nums sm:w-40"
                  {...form.register(`items.${i}.amount`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                  aria-label={t("portal.expense.create.removeItem")}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              <Input
                aria-label={`${t("portal.expense.review.itemNote")} ${i + 1}`}
                placeholder={t("portal.expense.create.itemNotePh")}
                className="h-9"
                maxLength={200}
                {...form.register(`items.${i}.note`)}
              />
              {typeof message === "string" && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {message}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-10 w-full border-dashed"
        onClick={() => append({ ...EMPTY_ITEM })}
        disabled={fields.length >= 20}
      >
        <Plus className="size-4" aria-hidden />
        {t("portal.expense.create.addItem")}
      </Button>

      {/* Live total */}
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5",
          total > 0 && "border-primary/30 bg-primary/5",
        )}
      >
        <span className="text-sm font-semibold">{t("portal.expense.create.totalPreview")}</span>
        <span className="pf-money text-lg font-semibold tabular-nums text-primary">
          {formatBdt(total, lang)}
        </span>
      </div>
    </div>
  )
}
