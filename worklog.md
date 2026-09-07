# PeopleFlow v2 — Worklog

Project: Bangladesh Office Management SaaS (Next.js 16 frontend + ERPNext backend engine)
Repo target: https://github.com/sharif418/peopleflow
Phase: 1 (Foundation)

---
Task ID: 0
Agent: CTO (main agent)
Task: Project planning, architecture decisions, foundation contracts

Work Log:
- Explored existing scaffold: Next.js 16.1.1, TS, Tailwind 4, shadcn/ui full set, Prisma+SQLite (db/custom.db), dev server running on :3000
- All required libs already installed (recharts, tanstack query/table, zustand, framer-motion, next-themes, sonner, RHF, zod, lucide)

Stage Summary — ARCHITECTURE DECISIONS (binding for all agents):

1. ROUTING: Single user-visible page route `/` only (sandbox constraint). The whole app is a client-side SPA:
   - `src/app/page.tsx` = SPA shell. Switches between: Landing / Login / AdminShell / PortalShell based on session.
   - Backend = Next.js API routes under `src/app/api/**` (NO server actions).
   - AdminShell lives at `src/components/admin/AdminShell.tsx` (default export).
   - PortalShell lives at `src/components/portal/PortalShell.tsx` (default export).

2. TENANCY / ERPNext STRATEGY (Phase 1 sandbox):
   - Control-plane DB = Prisma/SQLite (tenants, users, plans, feature flags, HR data) — simulates what will sync to per-org ERPNext sites later.
   - `src/server/frappe/erpnext-client.ts` = real Frappe REST client (for production, activated via ERPNEXT_BASE_URL env).
   - `deploy/` + `docs/ERPNEXT-SETUP.md` = frappe_docker / Coolify / bench provisioning assets for the Contabo server (deploy in a later phase).
   - Impersonation: super admin POSTs /api/auth/impersonate {orgId} → pf_imp cookie → /api/auth/me returns org context; exit via /api/auth/exit-impersonate.

3. AUTH: cookie session (HMAC-signed token, httpOnly cookie `pf_session`), scrypt password hashing (src/lib/crypto.ts — pure, no next imports; used by seed too).
   - Roles: SUPER_ADMIN, ORG_ADMIN.
   - Demo credentials (seeded): super@peopleflow.com / super123 (Super Admin) — admin@akash.com / admin123 (Org Admin of demo org "আকাশ গার্মেন্টস লিমিটেড").

4. I18N: custom lightweight system (NOT next-intl routing — single route constraint):
   - `src/lib/i18n/index.ts` exposes `useI18n(): { lang, setLang, t }`, t('admin.dashboard.title') resolves nested keys, falls back bn→en→key.
   - Base namespaces (common/landing/auth) in `src/lib/i18n/bn.ts` + `en.ts` (owned by main agent).
   - `src/lib/i18n/bn-admin.ts` + `en-admin.ts` = Super Admin agent ONLY.
   - `src/lib/i18n/bn-portal.ts` + `en-portal.ts` = Portal agent ONLY.
   - Default language: Bengali (bn). Toggle persists to localStorage.

5. FEATURE GATING: `src/lib/features.ts` = single registry of 16 features (key, icon, bn/en names, category) + 3 plans (starter/growth/enterprise). FeatureFlag rows per org. `hr_core` always ON.

6. API ENVELOPE: all APIs return `{ ok: true, data }` or `{ ok: false, error }` (JSON).

7. DESIGN: emerald/green primary (NO indigo/blue), light+dark via next-themes, Bengali font Hind Siliguri + Geist, mobile-first, sticky footer (min-h-screen flex flex-col + mt-auto), long lists max-h-96 overflow-y-auto, sonner toasts, framer-motion subtle.

8. FILE OWNERSHIP (parallel-agent conflict avoidance):
   - Main agent: page.tsx, layout.tsx, globals.css, providers, stores, lib/*, api/auth/*, api (root), components/shared/*, components/landing/*, components/auth/*, prisma/*, deploy/*, docs/*
   - Agent 2-a: components/admin/**, api/admin/**, i18n bn-admin/en-admin
   - Agent 2-b: components/portal/**, api/org/**, i18n bn-portal/en-portal

---
Task ID: 1
Agent: CTO (main agent)
Task: Foundation — schema, seed, auth, i18n, design system, SPA shell, landing, login

Work Log:
- Prisma schema rewritten (User/Organization/FeatureFlag/Department/Designation/Branch/Shift/Employee/AttendanceDay/Invoice/AuditLog), pushed to SQLite, client regenerated
- prisma/seed.ts: 4 orgs (আকাশ গার্মেন্টস=growth+18 employees+14d attendance, ঢাকা টেক=starter+6 emp, চট্টগ্রাম লজিস্টিকস=enterprise+9 emp, সিলেট টি এস্টেট=suspended), 6-month invoices, audit logs. Login: super@peopleflow.com/super123, admin@akash.com/admin123
- Auth: scrypt hashing + HMAC session cookie (pf_session), impersonation cookie (pf_imp) — src/lib/crypto.ts + src/lib/auth.ts; APIs: login/logout/me/impersonate/exit-impersonate (login rate-limited, audit logged) — curl-verified working
- features.ts: 16-feature registry (Lucide icons, bn/en names, categories) + 3 plans + PROVISION_STEPS (12s simulated timeline)
- api-utils.ts: ok()/fail() envelope, requireSuperAdmin()/requireOrg() guards, computeProvisionState() time-based state machine
- i18n: custom system (bn/en, nested dicts, {param} interpolation, localStorage persist) — base namespaces common/landing/auth filled; bn-admin/en-admin + bn-portal/en-portal are EMPTY STUBS for the subagents
- Design: emerald oklch palette in globals.css (+success/warning tokens, grain-bg, pf-scrollbar, dash animation), Hind Siliguri + Geist fonts, next-themes light/dark
- SPA shell: page.tsx (splash → landing/login → AdminShell/PortalShell via dynamic import + ImpersonationBanner)
- Landing: hero + animated dashboard mock, 16 module grid, 3-step how-it-works + architecture diagram, 3 pricing cards, CTA, sticky footer
- Login view: RHF-free simple form + demo account one-click chips + error/rate-limit states
- Shared: PageHeader, StatCard, EmptyState, ConfirmDialog, LangToggle, ThemeToggle, AppFooter, Splash, PeopleFlowLogo, format.ts (Bengali numerals/৳/Intl dates)
- PWA: manifest.webmanifest + icon.svg favicon + PNG icons (sharp-generated 192/512/maskable/apple)
- scripts/gen-icons.ts icon generator; .env.example + AUTH_SECRET in .env

Stage Summary:
- Foundation COMPLETE & verified: GET / 200, /api/auth/me 200, login flow curl-verified
- Contracts for subagents: useSessionStore, useI18n, FEATURES/PLANS, ok/fail envelope, guards, DOCTYPES, format.ts helpers, shared components
- ERPNext layer: src/server/frappe/* (real REST client for production) + deploy/docker-compose.yml + deploy/provision-site.sh + docs/ERPNEXT-SETUP.md

---
Task ID: 2-a
Agent: full-stack-developer (Super Admin Panel)
Task: Super Admin panel — organizations CRUD, provisioning wizard, feature gating, plans, health, audit + /api/admin/* routes

Work Log:
- Built i18n dictionaries bn-admin.ts / en-admin.ts (~250 keys, full Bengali)
- API routes: /api/admin/stats, /api/admin/organizations (GET+POST), organizations/[id] (GET+PATCH+DELETE with provisioning flip to active after 12s), plans, health, audit-logs; shared _lib/helpers.ts
- Components: AdminShell (sidebar+topbar+Sheet mobile nav), overview-view (StatCards + revenue AreaChart + plan donut + recent feeds), orgs-view (TanStack table, search+status filter), create-org-dialog (4-step wizard with auto-slug subdomain, plan radio cards, admin account, review), org-detail-dialog (Overview/Features/Plan/Danger tabs, grouped feature Switches with hr_core locked, plan change confirm, suspend/delete, impersonate), provision-progress (12s polling with PROVISION_STEPS checklist), plans-view, health-view, audit-view (pagination), badges, action-utils, types
- Endpoints curl-verified: stats/orgs/plans/health/audit GET 200; POST organizations 201; PATCH featureFlags + planKey (flags reset to plan defaults); DELETE 200; impersonate → /me returns ORG_ADMIN + impersonating:true
- Note: agent hit the turn limit near the end (final reporting); main agent verified all endpoints & components afterwards

Stage Summary:
- Super Admin panel fully functional and verified

---
Task ID: 2-b
Agent: full-stack-developer (Organization Portal)
Task: Org portal — setup wizard, dashboard, HR Core CRUD (employees/departments/designations/branches/shifts), locked modules with upgrade badges + /api/org/* routes

Work Log:
- Built i18n dictionaries bn-portal.ts / en-portal.ts (~300 keys, full Bengali)
- API routes: /api/org/overview, employees (GET paginated+search+filters, POST, PATCH/[id], DELETE/[id]), departments, designations, branches, shifts (all GET/POST + [id] PATCH/DELETE), setup (bulk create + setupCompleted=true); _lib/schemas.ts (Zod v4 validation), _lib/helpers.ts
- Components: PortalShell (feature-flag-driven nav: HR Core items + enabled features as ModulePlaceholderView + modules grid), setup-wizard (6 steps: welcome → departments chips → designations chips → shifts rows → optional first employees → success, with skip), dashboard-view (4 StatCards, 14-day attendance LineChart, headcount BarChart, recent hires, quick actions), employees-view (TanStack table, filters, pagination), employee-form-dialog (RHF+Zod, 13 fields, relation selects), employee-detail-dialog, hr-crud-view (generic CRUD for departments/designations/branches/shifts), modules-view (16 features grid with locked 🔒 + upgrade dialog), module-placeholder-view, labels, types
- Endpoints curl-verified: overview, departments list (5 with counts), employees paginated (PF-0018..), POST employee (auto-code PF-0019), PATCH, DELETE 200, invalid relation → 400 validation_failed, POST setup creates entities
- Note: agent hit the turn limit near the end; main agent verified everything afterwards

Stage Summary:
- Organization portal fully functional and verified; wizard flow tested end-to-end via API
