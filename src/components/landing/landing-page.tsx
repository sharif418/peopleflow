"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  Database,
  Globe,
  LayoutDashboard,
  Lock,
  Server,
  ShieldCheck,
  Smartphone,
  Users,
  Workflow,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PeopleFlowLogo } from "@/components/shared/peopleflow-logo"
import { LangToggle } from "@/components/shared/lang-toggle"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { AppFooter } from "@/components/shared/app-footer"
import { useI18n } from "@/lib/i18n"
import { FEATURES, PLANS } from "@/lib/features"
import { formatBdt, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-3 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
    </div>
  )
}

// ─── Hero visual: mini product mock ─────────────────────────────────────────

function HeroMock() {
  const { t, lang } = useI18n()
  const bars = [42, 58, 45, 70, 62, 84, 76, 92]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
      className="relative mx-auto w-full max-w-md lg:max-w-lg"
    >
      {/* dashboard card */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xl shadow-primary/10 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LayoutDashboard className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold">{t("landing.mockTitle")}</p>
              <p className="text-[10px] text-muted-foreground">{t("landing.mockSubtitle")}</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-success/15 text-success border-success/30">
            ● {t("common.active")}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { label: t("common.employees"), value: formatNumber(248, lang), icon: Users },
            { label: t("landing.mockPresent"), value: formatNumber(231, lang), icon: CalendarCheck },
            { label: t("landing.mockPayroll"), value: formatBdt(1840, lang) + "k", icon: Banknote },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-background p-2.5">
              <s.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
              <p className="mt-1.5 truncate text-sm font-semibold tabular-nums">{s.value}</p>
              <p className="truncate text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">{t("landing.mockTrend")}</p>
            <p className="text-[11px] font-semibold text-success">↗ 96.4%</p>
          </div>
          <div className="mt-2.5 flex h-20 items-end gap-1.5">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 4 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.5 + i * 0.07, duration: 0.5, ease: "easeOut" }}
                className={cn("flex-1 rounded-t-sm", i === bars.length - 1 ? "bg-primary" : "bg-primary/30")}
              />
            ))}
          </div>
        </div>
      </div>

      {/* floating badges */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="absolute -left-3 top-16 hidden animate-float rounded-xl border border-border bg-card px-3 py-2 shadow-lg sm:block"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold leading-tight">{t("landing.heroStatErp")}</p>
            <p className="text-[9px] text-muted-foreground">Frappe HRMS</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="absolute -right-3 bottom-14 hidden animate-float rounded-xl border border-border bg-card px-3 py-2 shadow-lg sm:block"
        style={{ animationDelay: "1.2s" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Smartphone className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold leading-tight">{t("landing.heroStatMobile")}</p>
            <p className="text-[9px] text-muted-foreground">PWA ready</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Landing page ────────────────────────────────────────────────────────────

export function LandingPage({ onLogin }: { onLogin: () => void }) {
  const { t, lang } = useI18n()

  const stats = [
    { value: t("landing.heroStatModules"), label: t("landing.heroStatModulesLabel"), icon: Workflow },
    { value: t("landing.heroStatLang"), label: t("landing.heroStatLangLabel"), icon: Globe },
    { value: t("landing.heroStatMobile"), label: t("landing.heroStatMobileLabel"), icon: Smartphone },
    { value: t("landing.heroStatErp"), label: t("landing.heroStatErpLabel"), icon: Server },
  ]

  const steps = [
    { n: 1, title: t("landing.howStep1Title"), desc: t("landing.howStep1Desc"), icon: Database },
    { n: 2, title: t("landing.howStep2Title"), desc: t("landing.howStep2Desc"), icon: Workflow },
    { n: 3, title: t("landing.howStep3Title"), desc: t("landing.howStep3Desc"), icon: LayoutDashboard },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <PeopleFlowLogo />
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Main">
            <a href="#modules" className="text-muted-foreground transition-colors hover:text-foreground">
              {t("landing.navFeatures")}
            </a>
            <a href="#how" className="text-muted-foreground transition-colors hover:text-foreground">
              {t("landing.navHow")}
            </a>
            <a href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
              {t("landing.navPricing")}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle className="hidden sm:inline-flex" />
            <ThemeToggle />
            <Button size="sm" className="h-9 rounded-full px-4" onClick={onLogin}>
              {t("landing.navLogin")}
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="grain-bg relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="flex flex-col items-start gap-6">
              <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 px-3 py-1 text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                {t("landing.heroBadge")}
              </Badge>

              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
                {t("landing.heroTitle1")}{" "}
                <span className="bg-gradient-to-br from-primary to-chart-2 bg-clip-text text-transparent">
                  {t("landing.heroTitle2")}
                </span>
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t("landing.heroSubtitle")}
              </p>

              <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                <Button size="lg" className="h-11 rounded-full px-6 text-sm" onClick={onLogin}>
                  {t("landing.heroCtaPrimary")}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-full px-6 text-sm"
                  onClick={onLogin}
                >
                  {t("landing.heroCtaSecondary")}
                </Button>
              </div>

              <dl className="grid w-full grid-cols-2 gap-3 pt-4 sm:grid-cols-4 sm:gap-4">
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col gap-1 border-l-2 border-primary/25 pl-3">
                    <dt className="flex items-center gap-1.5 text-sm font-semibold">
                      <s.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                      {s.value}
                    </dt>
                    <dd className="text-[11px] leading-snug text-muted-foreground">{s.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroMock />
          </div>
        </section>

        {/* ── Modules ── */}
        <section id="modules" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
          <SectionTitle title={t("landing.modulesTitle")} subtitle={t("landing.modulesSubtitle")} />
          <motion.div
            {...fadeUp}
            className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
          >
            {FEATURES.map((f) => (
              <Card
                key={f.key}
                className="group border-border/80 bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <CardContent className="flex flex-col gap-2.5 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <f.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold leading-snug">{lang === "bn" ? f.nameBn : f.nameEn}</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {lang === "bn" ? f.descBn : f.descEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </section>

        {/* ── How it works + architecture ── */}
        <section id="how" className="scroll-mt-20 border-y border-border bg-muted/40 py-14 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionTitle title={t("landing.howTitle")} subtitle={t("landing.howSubtitle")} />

            <motion.ol {...fadeUp} className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
              {steps.map((s) => (
                <li key={s.n} className="relative rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {lang === "bn" ? String(s.n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]) : s.n}
                    </span>
                    <s.icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                </li>
              ))}
            </motion.ol>

            {/* Architecture diagram */}
            <motion.div {...fadeUp} className="mt-10">
              <Card className="border-border bg-card shadow-xs">
                <CardContent className="p-5 sm:p-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Server className="h-4 w-4 text-primary" aria-hidden />
                    {t("landing.archTitle")}
                  </h3>
                  <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
                    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
                      <p className="text-xs font-semibold text-primary">Frontend</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t("landing.archFrontend")}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {["Next.js 16", "shadcn/ui", "বাংলা + EN"].map((chip) => (
                          <Badge key={chip} variant="secondary" className="text-[10px]">
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-center lg:flex-col lg:gap-3">
                      <svg viewBox="0 0 80 20" className="h-5 w-20 lg:h-20 lg:w-5" aria-hidden>
                        <line x1="4" y1="10" x2="76" y2="10" className="pf-dash-line" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <polygon points="70,5 78,10 70,15" fill="currentColor" />
                      </svg>
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {t("landing.archApi")}
                      </span>
                    </div>
                    <div className="rounded-xl border-2 border-chart-2/40 bg-chart-2/5 p-4">
                      <p className="text-xs font-semibold text-chart-2 dark:text-chart-2">Backend</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t("landing.archBackend")}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {["ERPNext", "Frappe HRMS", "PostgreSQL"].map((chip) => (
                          <Badge key={chip} variant="secondary" className="text-[10px]">
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3 shrink-0" aria-hidden />
                    {t("landing.archDb")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
          <SectionTitle title={t("landing.pricingTitle")} subtitle={t("landing.pricingSubtitle")} />

          <motion.div {...fadeUp} className="mt-10 grid gap-4 sm:gap-6 lg:grid-cols-3">
            {PLANS.map((p) => (
              <Card
                key={p.key}
                className={cn(
                  "relative flex flex-col border-border bg-card shadow-xs",
                  p.highlight && "border-primary shadow-lg shadow-primary/15 ring-1 ring-primary/30",
                )}
              >
                {p.highlight && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    {t("landing.pricingPopular")}
                  </Badge>
                )}
                <CardContent className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{lang === "bn" ? p.nameBn : p.nameEn}</h3>
                    {p.maxEmployees === -1 ? (
                      <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                        <ShieldCheck className="h-3 w-3" aria-hidden /> Enterprise
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{lang === "bn" ? p.taglineBn : p.taglineEn}</p>

                  <p className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight tabular-nums">
                      {formatBdt(p.priceBdt, lang)}
                    </span>
                    <span className="text-xs text-muted-foreground">{t("common.perMonth")}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.maxEmployees === -1
                      ? t("landing.pricingUnlimited")
                      : `${formatNumber(p.maxEmployees, lang)} ${t("landing.pricingEmployees")}`}
                  </p>

                  <ul className="mt-5 flex flex-1 flex-col gap-2">
                    {p.features.slice(0, 8).map((fk) => {
                      const f = FEATURES.find((x) => x.key === fk)
                      return (
                        <li key={fk} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                          {lang === "bn" ? f?.nameBn : f?.nameEn}
                        </li>
                      )
                    })}
                    {p.features.length > 8 && (
                      <li className="text-xs text-muted-foreground">+{formatNumber(p.features.length - 8, lang)}…</li>
                    )}
                  </ul>

                  <Button
                    className="mt-6 w-full rounded-full"
                    variant={p.highlight ? "default" : "outline"}
                    onClick={onLogin}
                  >
                    {t("landing.pricingCta")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </section>

        {/* ── CTA ── */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <motion.div
            {...fadeUp}
            className="grain-bg relative overflow-hidden rounded-3xl border border-primary/25 bg-primary px-6 py-12 text-center text-primary-foreground shadow-xl sm:px-10 sm:py-16"
          >
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.ctaTitle")}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-primary-foreground/80">{t("landing.ctaSubtitle")}</p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-6 h-11 rounded-full bg-background px-7 text-foreground hover:bg-background/90"
              onClick={onLogin}
            >
              {t("landing.ctaButton")}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
          </motion.div>
        </section>
      </main>

      <AppFooter />
    </div>
  )
}
