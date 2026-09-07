"use client"

// Add/remove chip list editor shared by the departments and designations
// wizard steps (deduplicates case-insensitively, Enter or button submits).
import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function ChipsStep({
  items,
  onChange,
  itemPh,
  addLabel,
  emptyHint,
}: {
  items: string[]
  onChange: (items: string[]) => void
  itemPh: string
  addLabel: string
  emptyHint: string
}) {
  const [draft, setDraft] = useState("")

  const add = () => {
    const name = draft.trim()
    if (!name) return
    if (items.some((i) => i.toLowerCase() === name.toLowerCase())) {
      setDraft("")
      return
    }
    onChange([...items, name])
    setDraft("")
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={itemPh}
          className="h-11 flex-1"
          autoFocus
          aria-label={itemPh}
        />
        <Button type="submit" variant="outline" className="h-11 shrink-0">
          <Plus className="size-4" aria-hidden />
          <span className="hidden sm:inline">{addLabel}</span>
        </Button>
      </form>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="h-9 max-w-full gap-1.5 rounded-full bg-primary/10 pl-3 pr-1.5 text-sm font-medium text-primary"
            >
              <span className="max-w-48 truncate">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                aria-label="remove"
                className="flex size-6 items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
