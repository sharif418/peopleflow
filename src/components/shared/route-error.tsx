"use client"

// Route-level error boundary fallback — retry + safe navigation
import Link from "next/link"
import { AlertTriangle, Home, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PeopleFlowLogo } from "@/components/shared/peopleflow-logo"
import { useI18n } from "@/lib/i18n"

export function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/30 shadow-lg shadow-destructive/5">
        <CardHeader className="items-center text-center">
          <PeopleFlowLogo markClassName="h-9 w-9" className="text-sm" />
          <span className="mx-auto mt-2 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <CardTitle className="mt-2 text-lg">{t("common.errorBoundaryTitle")}</CardTitle>
          <CardDescription>{t("common.errorBoundaryDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          <Button onClick={reset} className="gap-2">
            <RotateCw className="h-4 w-4" aria-hidden />
            {t("common.retry")}
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden />
              {t("common.backHome")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
