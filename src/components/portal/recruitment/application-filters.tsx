"use client"

// Applications filter bar — stage chips (scrollable), search input, job
// filter select and the "new application" trigger.
import { Search, UserPlus, X } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { APPLICATION_STAGES, type JobPostingRow } from "./types"

export function ApplicationFilters({
  stageFilter,
  onStageChange,
  qInput,
  onQChange,
  jobFilter,
  onJobFilterChange,
  jobs,
  onCreate,
}: {
  stageFilter: string
  onStageChange: (stage: string) => void
  qInput: string
  onQChange: (q: string) => void
  jobFilter: string
  onJobFilterChange: (jobId: string) => void
  jobs: JobPostingRow[]
  onCreate: () => void
}) {
  const { t } = useI18n()

  const chips: { value: string; key: string }[] = [
    { value: "", key: "portal.recruitment.applications.filterAll" },
    ...APPLICATION_STAGES.map((s) => ({ value: s, key: `portal.recruitment.stageShort.${s}` })),
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Stage chips (scrollable on mobile) */}
      <div
        className="flex items-center gap-2 overflow-x-auto pf-scrollbar pb-1"
        role="group"
        aria-label={t("portal.common.status")}
      >
        {chips.map((chip) => (
          <button
            type="button"
            key={chip.value || "all"}
            onClick={() => onStageChange(chip.value)}
            aria-pressed={stageFilter === chip.value}
            className={cn(
              "min-h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
              stageFilter === chip.value
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {t(chip.key)}
          </button>
        ))}
      </div>

      {/* Job filter + search + add */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={qInput}
            onChange={(e) => onQChange(e.target.value)}
            placeholder={t("portal.recruitment.applications.searchPlaceholder")}
            className="h-10 pl-9"
            aria-label={t("portal.recruitment.applications.searchPlaceholder")}
          />
          {qInput && (
            <button
              type="button"
              onClick={() => onQChange("")}
              aria-label={t("portal.common.close")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
        <Select value={jobFilter || "all"} onValueChange={(v) => onJobFilterChange(v === "all" ? "" : v)}>
          <SelectTrigger className="h-10 w-full sm:w-64" aria-label={t("portal.recruitment.createApplication.job")}>
            <SelectValue placeholder={t("portal.recruitment.applications.jobAll")} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all" className="min-h-10">
              {t("portal.recruitment.applications.jobAll")}
            </SelectItem>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id} className="min-h-10">
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-10" onClick={onCreate}>
          <UserPlus className="size-4" aria-hidden />
          {t("portal.recruitment.applications.newApplication")}
        </Button>
      </div>
    </div>
  )
}
