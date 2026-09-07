"use client"

// 1-5 star rating control — radio group semantics, 44px touch targets.
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function StarRating({
  value,
  onChange,
  disabled = false,
  label,
}: {
  value: number
  onChange: (score: number) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            "flex size-11 items-center justify-center rounded-lg transition-colors",
            "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            disabled && "cursor-default opacity-70 hover:bg-transparent",
          )}
        >
          <Star
            className={cn(
              "size-5 transition-colors",
              n <= value ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40",
            )}
            aria-hidden
          />
          <span className="sr-only">{` ${n}`}</span>
        </button>
      ))}
    </div>
  )
}
