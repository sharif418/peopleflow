"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Building2, KeyRound, Loader2, LogIn, Mail, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PeopleFlowLogo } from "@/components/shared/peopleflow-logo"
import { LangToggle } from "@/components/shared/lang-toggle"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { useI18n } from "@/lib/i18n"
import { useSessionStore } from "@/store/session"
import type { SessionOrg, SessionUser } from "@/lib/types"

const DEMO_ACCOUNTS = [
  { email: "super@peopleflow.com", password: "super123", key: "super", icon: ShieldCheck },
  { email: "admin@akash.com", password: "admin123", key: "hr", icon: Building2 },
]

export function LoginView({ onBack }: { onBack: () => void }) {
  const { t } = useI18n()
  const setSession = useSessionStore((s) => s.setSession)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doLogin = async (em: string, pw: string) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: pw }),
      })
      const json = (await res.json()) as {
        ok: boolean
        error?: string
        data?: { user: SessionUser; org: SessionOrg | null; impersonating: boolean }
      }
      if (json.ok && json.data) {
        setSession(json.data.user, json.data.org, json.data.impersonating)
        toast.success(t("auth.loginTitle") + " ✓")
      } else {
        setError(json.error === "invalid credentials" ? t("auth.invalidCredentials") : t("common.error"))
      }
    } catch {
      setError(t("common.error"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grain-bg flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6">
        <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-muted-foreground" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("auth.backToHome")}</span>
        </Button>
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <Card className="border-border/80 shadow-lg shadow-primary/5">
            <CardHeader className="items-center text-center">
              <PeopleFlowLogo markClassName="h-10 w-10" className="text-lg" />
              <CardTitle className="mt-2 text-xl">{t("auth.loginTitle")}</CardTitle>
              <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void doLogin(email, password)
                }}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-email">{t("common.email")}</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder={t("auth.emailPlaceholder")}
                      className="h-10 pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-password">{t("common.password")}</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder={t("auth.passwordPlaceholder")}
                      className="h-10 pl-9 pr-14"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="h-10 w-full" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      {t("auth.loggingIn")}
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" aria-hidden />
                      {t("auth.loginSubmit")}
                    </>
                  )}
                </Button>
              </form>

              <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("auth.demoTitle")}
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEmail(acc.email)
                        setPassword(acc.password)
                        void doLogin(acc.email, acc.password)
                      }}
                      className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <acc.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium">
                            {acc.key === "super" ? t("auth.demoSuper") : t("auth.demoHr")}
                          </span>
                          <span className="block truncate text-[10px] text-muted-foreground">{acc.email}</span>
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        {t("auth.demoUse")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
