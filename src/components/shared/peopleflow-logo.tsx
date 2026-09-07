import { cn } from "@/lib/utils"

export function PeopleFlowMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pf-grad" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#046c4e" />
          <stop offset="1" stopColor="#0aa27c" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#pf-grad)" />
      <path
        d="M9 36.5 C 17 34, 21 28, 24 21.5 C 26.5 16, 31 12.5, 39 11"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="13" cy="33.5" r="4" fill="white" opacity="0.75" />
      <circle cx="24" cy="23.5" r="5" fill="white" opacity="0.88" />
      <circle cx="36.5" cy="12.5" r="6.2" fill="white" />
    </svg>
  )
}

export function PeopleFlowLogo({
  className,
  markClassName,
  showMark = true,
}: {
  className?: string
  markClassName?: string
  showMark?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      {showMark && <PeopleFlowMark className={cn("h-8 w-8 shrink-0", markClassName)} />}
      <span className="font-semibold tracking-tight text-[1.15rem] leading-none">
        People<span className="text-primary">Flow</span>
      </span>
    </span>
  )
}
