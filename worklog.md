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

---
Task ID: 3
Agent: CTO (main agent)
Task: Integration, E2E verification, GitHub push attempt

Work Log:
- Verified both subagent outputs (they hit turn-limits at the end but delivered complete, working code)
- Full-project lint: clean (1 known TanStack Table warning only)
- curl-verified every API: admin stats/orgs(plans/health/audit), org create→provision(12s)→active, PATCH features/plan, DELETE, impersonate/exit, org overview, employees CRUD (+auto-code, validation), departments CRUD, setup endpoint
- agent-browser E2E golden path ALL PASSING:
  • Landing (bn default) → EN toggle → back to bn
  • Login via one-click demo chips (both accounts)
  • Super Admin overview (4 orgs, revenue chart, plan donut, recent feeds)
  • Create org wizard 4 steps → provisioning progress (12s, step checklist) → active
  • Org detail dialog: tabs (Overview/Features/Plan/Danger), feature Switches, plan change
  • Impersonate → portal with banner + growth-plan feature-gated nav (হাজিরা, ছুটি, পেরোল, নিয়োগ, পারফরম্যান্স, খরচ)
  • Setup wizard full run: departments→designations→shifts→first employee→complete → dashboard "মোট কর্মী: ১"
  • Employees: table + filters; add employee via form dialog (RHF+Zod, native date input) → PF-0002 created
  • Modules grid: 9 locked features with "🔒 আপগ্রেড করুন" → upgrade dialog → sales-contact toast
  • Exit impersonation → back to admin (toast ✓)
  • HR admin login (আকাশ গার্মেন্টস): dashboard ১৮ কর্মী, ৳৪৬৯,৮০০ বেতন, 2 recharts charts
  • Mobile 375px: no horizontal scroll, hamburger Sheet nav, footer natural push
  • Footer sticky verified on 2400px viewport (sticksToBottom: true)
  • Dark mode toggle works; zero console/page errors
- Re-seeded DB to pristine demo state after testing
- GitHub push attempt: token authenticates as sharif418 BUT peopleflow repo = 404 (not created or not in token scope); token cannot create repos (403). Committed locally (180 files, 22,868 insertions). Remote set to clean URL. ⚠️ USER ACTION NEEDED: create sharif418/peopleflow on GitHub + add it to the fine-grained PAT's repository access, then run: git push -u origin main

Stage Summary:
- Phase 1 platform is COMPLETE and browser-verified end-to-end
- GitHub push BLOCKED on token/repo access — everything else done

---
Task ID: 4 (planning)
Agent: CTO (main agent)
Task: Phase 2 — Core HR modules (Attendance + ZKTeco sync, Leave, Payroll BD, Org Settings)

Work Log:
- QA via agent-browser: landing/login/portal all stable, no errors — attendance/leave/payroll are placeholders → THIS ROUND's focus
- Prisma schema extended: Device, AttendanceLog (unique employee+date), LeaveType, LeaveRequest, SalaryStructure, SalaryComponent, Payslip, PayslipItem; Organization + address/contactPhone/contactEmail/weekendConfig/pfEnabled/pfPercent — pushed to SQLite
- Seed: 2 ZKTeco devices, 14 working-days attendance logs (18 employees, Fri/Sat weekend skipped, aggregates derived from logs), 5 BD leave types + 11 requests (pending/approved/rejected/cancelled), default salary structure (BASIC 50/HRA 30/MED 10/CONV 10) + last-month confirmed payslips for 18 employees
- i18n: created + registered module namespaces portal.attendance / portal.leave / portal.payroll / portal.settings (files bn-portal-{module}.ts / en-portal-{module}.ts — one OWNER agent each, no shared i18n file edits!)

Stage Summary — CONTRACTS FOR TASK 4 SUBAGENTS (binding):
- apiFetch<T>(path, init) from @/lib/fetcher; server envelope ok()/fail(); guard requireOrg() from @/lib/api-utils
- API base: /api/org/<module>/** route.ts files; audit() helper exists in src/app/api/org/_lib/helpers.ts
- t("portal.attendance.xxx") / t("portal.leave.xxx") / t("portal.payroll.xxx") / t("portal.settings.xxx")
- Each module default-exports its shell: AttendanceModule (components/portal/attendance/), LeaveModule (components/portal/leave/), PayrollModule (components/portal/payroll/), OrgSettingsModule (components/portal/settings/)
- MAIN AGENT (me) wires PortalShell nav + PortalSection types + api.ts query keys AFTER subagents deliver. Subagents MUST NOT touch PortalShell.tsx, types.ts, api.ts, index.ts, page.tsx
- BD payroll math: basic=50% gross, hra=30%, medical=10%, conveyance=remainder; PF=org.pfPercent(12)% of basic (employee+employer)

---
Task ID: 4-c
Agent: full-stack-developer (Payroll + Settings)
Task: Payroll module (BD rules, structures, payslips) + Org settings

Work Log:
- Read worklog + all contracts (api-utils/fetcher/i18n/schemas/helpers, dashboard StatCard patterns, employees route patterns); verified seeded state (18 confirmed payslips 2026-08, default structure 4 components, org pf 12%)
- i18n: bn/en-portal-payroll (130 keys each) + bn/en-portal-settings (51 keys each) — full Bengali, exact mirrors, {param} interpolation for generate/toasts/periods
- Server engine: api/org/payroll/_lib/payroll.ts — pure computePayslip (percent=floor-round of gross, last percent-earning adjusted so earnings sum EXACTLY gross, PF=pfPercent% of BASIC with employer match, Bengali PF label "প্রভিডেন্ট ফান্ড (১২%)"), BD_DEFAULTS export, currentPeriod/isPeriodKey helpers; _lib/schemas.ts (Zod + componentRules: min_earning/percent_range/percent_sum)
- API routes (all requireOrg + ok/fail + audit on mutations): overview (period stats + breakdown + top-5 recentSlips), structures GET/POST (first becomes default, P2002→name_taken), structures/[id] PATCH (isDefault flips others, components replace) + DELETE (is_default/in_use guards), payslips GET (12/page, period/status/q filters, q via employee relation), payslips/[id] GET (full document + org header + items earnings-first) + PATCH (confirm/mark_paid/revert_draft transition table, paid=409), generate POST (upsert drafts only, skips confirmed/paid, 1.5s delay, structure resolution default→first→BD_DEFAULTS), settings GET/PATCH (weekendConfig array, pfPercent 0-30, name/subdomain read-only)
- Frontend: PayrollModule.tsx (default export) — month input + period quick-chips, 4 stat cards (PF with employer+employee note), generate AlertDialog (period/structure/count + overwrite warning, spinner, success+skipped toasts), status chips with counts + search, payslip card grid (avatar/code/designation, gross→net arrow, PF badge, status badges draft=muted/confirmed=emerald/paid=success+check, keyboard-accessible, framer-motion stagger), pagination, structures tab (default badge, components ৫০%/৳৫,০০০ emerald/rose, abbr chips, usage count)
- payslip-detail-dialog.tsx — official-document styling: centered org header (name+address), rotated status stamp, employee grid, earnings/deductions tables (mono ৳ right-aligned), bold totals + big emerald NET PAY, PF footer (কর্মী % + নিয়োগকর্তা % = মোট সঞ্চয়), per-status action buttons with ConfirmDialogs
- structure-form-dialog.tsx — component row builder (name/abbr/type/calcType/value, add/remove rows), live percent-sum badge, validation mirroring server; keyed remount (no setState-in-effect)
- OrgSettingsModule.tsx (default export) — Profile card (locked name/subdomain with Lock icon, address textarea, phone/email, dirty-aware save), Workweek card (7 toggle pills, workday=emerald/weekend=muted + legend + hint), Payroll config card (PF Switch + 0-30 slider with Bengali numeral display + next-generation info alert), Info card (plan badge via PLANS, employee count, setup status, created date, subdomain) — state initialized in child components from `initial` prop (React-compiler clean)
- Fixed lint errors (react-hooks/set-state-in-effect) via keyed remount + child-component state init; fixed settings PATCH Zod nullable/optional bug found by curl

Stage Summary:
- Endpoints (all curl-verified with cookie login): GET overview?period=2026-08 (18 confirmed, gross 485000, net 455900, pf 58200); GET structures (1 default, 4 comps); POST generate 2026-09 → {generated:18, skipped:0}, re-gen after 1 paid → {generated:17, skipped:1}; GET payslips?period=2026-08&status=confirmed → 18 (12/page); GET payslips/[id] → 5 items, earnings sum == gross to the taka; PATCH confirm → confirmed, mark_paid → paid, paid→revert = 409; structures POST 0-earnings → 400 min_earning, percent_sum guard, DELETE is_default/in_use guards, isDefault flip works; settings GET/PATCH + validation errors (phone/email/day/pfPercent>30 → 400); audit entries (payroll.generated, payroll.payslip.confirmed, settings.updated) written
- bun run lint: 0 errors (1 pre-existing known warning in employees-view); tsc --noEmit: clean for all owned files; dev.log: zero errors; test data cleaned (DB back to seeded state)
- Main agent wiring contract: `PayrollModule` default-export from components/portal/payroll/PayrollModule (no props), `OrgSettingsModule` from components/portal/settings/OrgSettingsModule (no props); query keys ["org","payroll",*] / ["org","settings"]; computePayslip + BD_DEFAULTS reusable from api/org/payroll/_lib/payroll (pure, no next/server import)

---
Task ID: 4-a
Agent: full-stack-developer (Attendance)
Task: Attendance module — ZKTeco-style device sync, today grid, month register, manual punch

Work Log:
- Read worklog + all contracts (api-utils, fetcher, employees route/_lib patterns, i18n style, dashboard/employees views, format.ts, shared components)
- Filled i18n dictionaries bn-portal-attendance.ts / en-portal-attendance.ts (~153 keys: title, stats, tabs, statuses, devices, sync phases, today, month (day names, short codes), punch dialog, relative time, toasts, errors)
- Backend helpers src/app/api/org/attendance/_lib/attendance.ts: localIsoDate/localIsoMonth, time↔minutes, weekendConfig parser, computePunch (present if checkIn ≤ shiftStart+10min grace else late; absent/on_leave if no checkIn; workedMinutes = out−in−60min lunch), recomputeAttendanceDay (upserts AttendanceDay from logs, half_day→present), loadEmployeesWithLogs, toDayItem; _lib/schemas.ts (Zod v4: punch, sync, device create/patch + zodError)
- API routes (all requireOrg + ok/fail envelope + audit() on writes):
  • GET /api/org/attendance?date= → {date, isWeekend, stats{present,late,absent,onLeave,halfDay,noRecord}, items[18]} (one row per active/probation employee + shift + log)
  • POST /api/org/attendance → manual punch upsert (employee+date unique), status from shift unless explicit, source "manual", recomputes AttendanceDay, audits attendance.manual_punch
  • GET /api/org/attendance/month?month= → {month, days[{date,dayOfWeek,isWeekend}], rows[{code,name,summary{present,late,absent,onLeave,halfDays,noRecord,workedHours},byDate}], totals}
  • POST /api/org/attendance/sync → ZKTeco-style pull: 1.2s delay, missing|full mode, deterministic prand per (code,day): checkIn shiftStart−15..+35, checkOut shiftEnd±40 (past) / 60% null (today, still working), source "device"+deviceId, device.status online + lastSyncAt now, recompute AttendanceDay, audit attendance.device_sync → {syncedCount, date, mode, device, log[day-items]}
  • GET /api/org/attendance/devices → devices + today's device-source punch counts (groupBy deviceId)
  • POST /api/org/attendance/devices → add (name+serialNo required, IPv4 regex, unique per org → P2002 serial_taken)
  • PATCH /api/org/attendance/devices/[id] → rename/location/ip/status
- Frontend src/components/portal/attendance/: AttendanceModule.tsx (default export — PageHeader + 4 StatCards (উপস্থিত/দেরি/অনুপস্থিত/ছুটিতে, emerald/amber/red/teal) + ofTotal caption + DeviceCards + Tabs আজকের হাজিরা/মাসিক রেজিস্টার with framer-motion transitions); device-cards.tsx (horizontal snap-scroll cards: model, serial mono, IP, live pulse dot online/offline, Bengali relative time "২ ঘণ্টা আগে", today punch count, sync button with phase text connect→read→save + animated progress bar; + dashed add-device card → dialog with model select K40/iClock 990/SF300/অন্য); today-view.tsx (date picker + full Bengali date, deferred search, weekend banner, no-records sync CTA, desktop table (avatar/code/dept, mono in/out, status badge with live pulse dot, worked hours, Fingerprint/PenLine source) / mobile cards, max-h-560 pf-scrollbar); month-view.tsx (month picker + legend, desktop sticky-column/sticky-header matrix with 30 day cols, weekend tint, status dots with checkIn tooltips, per-row summary in sticky cell, totals tfoot; mobile accordion with dot strip + summary grid + totals card); punch-dialog.tsx (manual upsert: time inputs, status select auto/5 statuses, note, live worked preview, error mapping); use-device-sync.ts (shared mutation + phase hook); attendance-types.ts (types + query keys + endpoints); attendance-labels.ts (status badge/dot colors incl. teal on_leave, orange half_day, relative time, worked hours, date/month labels)
- Verification: bunx eslint on my files → 0 errors/0 warnings; bunx tsc --noEmit → 0 errors in my files; SSR smoke test (renderToString with mocked query cache, 18 employees + 30-day month) rendered both tabs fully (177KB/161KB HTML) — then deleted; curl-verified all 7 endpoints incl. error paths (invalid_date, invalid_time_range, invalid_employee 404, serial_taken 409, device_not_found 404); sync full→18 records + AttendanceDay recompute confirmed via /api/org/overview; audit rows verified via prisma; browser regression: landing+login+portal OK, zero console/page errors; re-seeded DB to pristine demo state after testing

Stage Summary:
- Endpoints built: 7 (GET/POST day, GET month, POST sync, GET/POST devices, PATCH devices/[id]) — all curl-verified 200/400/404/409 as appropriate
- Components built: AttendanceModule (default export, ready for PortalShell wiring via `feature:attendance`) + 7 subcomponents in components/portal/attendance/
- Files created: 2 i18n dicts, 6 API route files + 2 _lib helpers, 8 component files (all inside my owned paths only)
- i18n: 153 keys full Bengali + matching English, accessed as t("portal.attendance.*"); all 106 used keys verified resolvable
- Notes for main agent: AttendanceModule takes NO props (self-contained); query keys ["org","attendance",...] — invalidate prefix ["org","attendance"] + ["org","overview"] on mutations (already done internally); month matrix uses raw <table> (not shadcn Table) for sticky column+header with border-separate

---
Task ID: 4-b
Agent: full-stack-developer (Leave)
Task: Leave module — types CRUD, requests + approvals, balances

Work Log:
- Read worklog + contracts (api-utils, fetcher, org employees route, _lib helpers/schemas, bn-portal style, format.ts, PortalShell wiring contract)
- i18n: filled src/lib/i18n/bn-portal-leave.ts + en-portal-leave.ts (~125 keys: title/stats/tabs/status/filters/requests/actions/review/create/types/balances/toasts/errors/time) — exact bn/en mirrors, accessed as t("portal.leave.xxx")
- API helpers in src/app/api/org/leave/_lib/ (own folder, org _lib untouched): helpers.ts (parseWeekend from weekendConfig w/ fri+sat default, isoOf/todayIso, calendarSpan, rangesOverlap, countWorkingDays, LEAVE_REQUEST_INCLUDE, activeLeaveRequests, buildUsageIndex, balanceExcludingSelf, hasOverlap) + schemas.ts (Zod v4: type create/patch, request create, request action + zodLeaveError flattening)
- Routes: types GET(usage counts: approved/pending/employeesOnLeaveToday)+POST(unique name→409 name_taken); types/[id] PATCH+DELETE(in_use 409 guard, audit); requests GET(status comma-filter, employeeId, q over name/code/reason, 12/page, pending-first then createdAt desc, per-row overlapsExisting/exceedsBalance/balanceAvailable, summary {pending,approvedToday,approvedMonth,onLeaveToday,rejectedMonth,totalTypes}) + POST(date validations invalid_range/past_date/span_too_long, weekend_only, overlap 409, insufficient_balance 409, days=working days excl weekend, status pending, audit leave.requested); requests/[id] PATCH approve/reject/cancel (not_pending 409, approve re-validates balance, reviewerNote+reviewedAt, audit leave.approved/rejected/cancelled); balances GET ?year (per active employee rows {allocated,used,pending,remaining} + totalUsed + type list)
- Frontend src/components/portal/leave/: LeaveModule.tsx (default export; PageHeader + 4 StatCards — pending warning+pulse, onLeaveToday, approvedMonth, totalTypes; shadcn Tabs + framer-motion tab fade; stats share cache with requests tab via identical default query key), requests-tab.tsx (filter chips সব/অপেক্ষমাণ/অনুমোদিত/বাতিল+প্রত্যাখ্যাত, search, pagination, stagger list, optimistic status update + rollback + invalidate + sonner, ConfirmDialog cancel), request-card.tsx (avatar+name+code, hue badge, Bengali date range ১২ জানুয়ারী – ১৪ জানুয়ারী via Intl bn-BD long month, days badge, reason, ⚠ ওভারল্যাপ/⚠ ব্যালেন্স অতিরিক্ত chips, balanceAvailable, reviewerNote, 3 action buttons), review-dialog.tsx (approve/reject + optional note), create-request-dialog.tsx (RHF+Zod, searchable employee combobox Popover+Command, type Select, native dates, live working-days preview excl Fri/Sat, live balance line + warning from balances query), types-tab.tsx (card grid, paid/carry badges, usage stats, edit/delete), type-form-dialog.tsx (RHF+Zod + Switch rows, Bengali days preview), balances-tab.tsx (year select, desktop table per-type columns + mobile stacked cards, emerald→amber→rose progress bars at 60%/85%, max-h-34rem pf-scrollbar), types.ts (response types, leaveKeys, LEAVE_ENDPOINTS, status filter map), utils.ts (5 fixed hues emerald/amber/teal/rose/violet, status badges, formatLeaveDate/Range, relativeLeaveTime, workingDaysClient, progressTone, leaveErrorMessage error-code→i18n map)
- Replaced form.watch with useWatch (React Compiler clean); StatCard trendLabel dropped (renders only with numeric trend)
- Verification: eslint on my files → 0 errors/0 warnings (project-wide remaining errors are Task 4-c's payroll file, untouched); tsc --noEmit → 0 errors in leave files; curl cookie-flow suite (/home/z/leave-tests/leave_tests.py) → 41/41 PASS incl. login, types CRUD + in_use/name_taken/validation guards, requests filters/search/summary, weekend-only Fri–Sat 400, overlap 409, insufficient_balance 409 (POST + approve-time revalidation after type days edit), approve/reject/cancel with notes, not_pending 409, balances + invalid_year 400; dev.log clean; DB reseeded to pristine demo state after testing (seed actually has 7 pending + 2 approved + 1 rejected + 1 cancelled = 11 — brief's "8 pending" was off by one)

Stage Summary:
- Endpoints (all org-scoped, ok/fail envelope, audit-logged mutations): GET+POST /api/org/leave/types; PATCH+DELETE /api/org/leave/types/[id]; GET+POST /api/org/leave/requests; PATCH /api/org/leave/requests/[id]; GET /api/org/leave/balances?year=
- Components: LeaveModule (default export, ready for PortalShell wiring via feature:leave) + 8 subcomponents, mobile-first, emerald palette (no indigo/blue), dark-mode via semantic tokens, framer-motion stagger/fade, skeletons + EmptyState + retry, sonner toasts, TanStack Query with shared leaveKeys.all invalidation
- i18n: bn-portal-leave.ts / en-portal-leave.ts filled and registered (no shared file edits)
- Risks: requests GET does JS-side sort/paginate after Prisma filter (pending-first not expressible in Prisma orderBy) — fine at sandbox scale; client working-day preview hardcodes Fri/Sat (org weekendConfig not exposed in session store — server is the source of truth); balances include status="active" employees only; dev server was found dead mid-task and restarted detached (bun run dev, port 3000)

---
Task ID: 4-integration
Agent: CTO (main agent)
Task: Phase 2 integration — wire modules into PortalShell, dashboard upgrade, styling polish, E2E QA, GitHub push

Work Log:
- Wired PortalShell: feature:attendance→AttendanceModule, feature:leave→LeaveModule, feature:payroll→PayrollModule (default exports), new "settings" core nav → OrgSettingsModule; PortalSection type + shell i18n keys added
- Fixed payroll default-export import error (500 → 200)
- Payroll UX: auto-jump to latest period with data when current month is empty (React render-phase adjust pattern; lint-clean)
- Overview API: + salaryByDept (groupBy monthlySalary per dept), + pendingLeaveRequests count
- Dashboard upgrade: pending-leave alert banner (click→leave module, warning color + count badge), salary-by-department BarChart (৳ thousands, chart-2 teal), feature-aware quick actions (হাজিরা দেখুন / ছুটির আবেদন যাচাই + pending badge), restructured grids
- Styling polish (globals.css): pf-card-hover (border+glow), pf-dot + pulse live animation, pf-shimmer skeleton sweep, pf-money/pf-time tabular figures, pf-payslip-print @media print, pf-hairline gradient separator — applied to device cards, request cards, payslip dialog
- E2E QA (agent-browser): attendance (stats ৯/৭/১/১, device cards, month register matrix ০১-৩০, sync 200 + 1.2s, punch dialog), leave (7 pending, approve flow → 6, note dialog), payroll (auto-period ৳৪৮৫,০০০/৳৪৫৫,৯০০/৳৫৮,২০০/১৮, payslip document dialog with org address), settings (profile/workweek/PF cards), dashboard new widgets, mobile 375px (no h-overflow, hamburger Sheet, inner pf-scrollbar), dark mode OK, admin panel regression OK, dev.log 0 errors
- DB re-seeded to pristine state after QA mutations
- Lint: 0 errors (1 known TanStack table warning)
- GITHUB PUSH SUCCESSFUL: https://github.com/sharif418/peopleflow — main branch live with all 4 commits (repo was created by user; PAT access confirmed)

Stage Summary:
- Phase 2 COMPLETE: Attendance (ZKTeco-style), Leave, Payroll (BD rules), Org Settings — all browser-verified
- 69 files changed, +10,766 lines this phase; total platform now: 4 real modules + HR core + super admin panel
- Remaining Phase 3 candidates: recruitment, performance, expense modules; ERPNext live sync; per-tenant site provisioning for real

---
Task ID: 3-a
Agent: CTO (main agent)
Task: Phase 3 — Engineering integrity fixes + App Router refactor + new module scaffolding

Work Log:
- Baseline QA via agent-browser: super admin + HR admin flows verified working (Phase 2 state)
- Stage 1 (commit fbee1d4): removed `typescript.ignoreBuildErrors`, set `reactStrictMode: true`; fixed 5 hidden TS errors via new `AuthedContext` type in api-utils; untracked sandbox artifacts (Caddyfile, .zscripts/, download/, examples/, mini-services/, tests/) from repo; tsconfig/eslint exclude sandbox dirs
- Stage 2 (commit 3da2fa3): full routing refactor from Zustand SPA to Next.js App Router:
  - `/` landing w/ server-side auth redirect; `/login` page
  - `/admin/*` layout guard (SUPER_ADMIN, non-impersonating) + 5 pages (overview, organizations, plans, health, audit)
  - `/portal/[orgId]/*` layout guard (org context match, canonical subdomain URLs like /portal/akash) + 8 static pages + `[feature]` dynamic module route (real modules: attendance/leave/payroll; locked view for disabled flags; 404 unknown)
  - loading.tsx + error.tsx boundaries for admin/portal, root not-found.tsx
  - AdminChrome/PortalChrome + Link-based sidebars; session store cleaned (no SPA view state); admin-ui store for org-detail dialog; useLogout hook; impersonation round-trip routing
  - E2E verified with agent-browser: login both roles, module routes, impersonation enter/exit, locked feature view, mobile sheet closes on nav
- Stage 3 scaffolding: Prisma models added for Recruitment (JobPosting/JobApplication/Interview), Performance (Goal/Appraisal/AppraisalItem), Expenses (ExpenseClaim/ExpenseItem) — schema pushed, client regenerated
- Feature keys recruitment/performance/expense already exist in features.ts (Growth plan includes them)

Stage Summary:
- Repo state: clean engineering baseline — tsc --noEmit passes, lint 0 errors, reactStrictMode on, no sandbox artifacts
- Routing: proper App Router with server-side guards, layouts, loading/error boundaries, canonical org URLs
- New module schemas ready for agents: type-safe Prisma models with BD context (BDT amounts, Bengali labels, BD phone formats)
- NEXT: 3 parallel module builds (recruitment/performance/expenses) by subagents → integration by CTO → component splitting (PayrollModule 753 lines etc.) → styling polish → final QA
- Integration checklist for CTO after agents finish: i18n index.ts dict registration, [feature]/page.tsx MODULES registry, seed execution, tsc/lint, browser QA
---
Task ID: 3-expenses
Agent: Expense Claims module builder
Task: Expense Claims module — line-item claims, submit→approve/reject→paid workflow, BDT amounts

Work Log:
- Read worklog + contracts (leave module as reference standard: api/org/leave _lib conventions, LeaveModule UI structure, api-utils/fetcher/format, ExpenseClaim/ExpenseItem schema — untouched)
- i18n: created src/lib/i18n/bn-portal-expense.ts + en-portal-expense.ts (~150 keys: title/stats/tabs/status/filter/category(7 bn labels)/claims/pending/actions/review/create/toasts/errors/time) — exact bn/en mirrors, accessed as t("portal.expense.*"); NOT yet registered in i18n/index.ts (CTO integration step)
- API _lib (src/app/api/org/expenses/_lib/): helpers.ts (EXPENSE_CATEGORIES, CLAIM_LIST/DETAIL includes, resolveTransition state machine + transitionErrorCode, claimsSummary pending/pendingAmount/approvedMonthAmount/totalClaims, allClaimRows) + schemas.ts (Zod v4: claimCreate items[{label,amount int ৳1..1M,note?}] 1..20, claimAction approve|reject|mark_paid, zodExpenseError)
- Routes: GET/POST /api/org/leave-pattern claims (12/page pending-first JS-sort; filters status comma-list/employeeId/category/q over title+description+employee; org summary; POST verifies employee in org, totalAmount=Σitems, status submitted, nested items create, audit expense.claimed) + GET/PATCH/DELETE claims/[id] (detail+items+employee; PATCH submitted→approved|rejected (reject needs note → note_required), approved→paid (mark_paid keeps approval note unless payment note given), invalid transitions → not_submitted/not_approved 409; DELETE only submitted; audit expense.approved/rejected/paid/deleted)
- Found+fixed a state-machine bug via curl (approve returned status "approve" not "approved" — ACTION_TARGET map added), re-verified full lifecycle
- Frontend src/components/portal/expenses/: ExpenseModule.tsx (DEFAULT export, no props — PageHeader + 4 StatCards pending/pendingAmount ৳/approvedMonth ৳/totalClaims + Tabs "সব দাবি" + "অপেক্ষমাণ" with count badge, framer-motion tab fade, stats share cache with claims tab via identical default query key); claims-tab.tsx (filter row via claims-filters.tsx Selects + search, stagger cards, review dialog, delete ConfirmDialog, pagination); pending-tab.tsx (mini summary cards count/total ৳/largest + submitted inbox with quick-approve, reject→dialog, review); claim-card.tsx (shared: avatar+employee, title, category icon badge, big ৳ pf-money amount, status badge, expense date + relative time, reviewer note, contextual actions); claim-review-dialog.tsx (full detail: claimant card, responsive items table with total, per-status approve/reject(note required, disabled+title hint)/mark-paid, lazy detail query); claim-form-dialog.tsx (RHF+Zod, EmployeeCombobox extract, category select with 7 Bengali labels+icons, native date, description, items-editor.tsx useFieldArray dynamic rows label/amount/note + live ৳ total, resets on success); employee-combobox.tsx + claims-filters.tsx extracted to keep files ≤~275 lines; use-claim-actions.ts (shared mutations: optimistic status patch + rollback + sonner + invalidate expenseKeys.all; delete removes from cache); types.ts (ClaimRow/ClaimDetail/ExpenseItemRow/ClaimsSummary + expenseKeys claims/detail + endpoints); utils.ts (category meta 7 tones no indigo/blue — teal/amber/violet/rose/emerald/orange/muted + lucide icons, status badge classes, formatExpenseDate bn long-month, relativeExpenseTime, expenseErrorMessage error-code→i18n)
- Seed scripts/seed-expenses.ts (bun scripts/seed-expenses.ts, import { db } from "@/lib/db"): 6 BD-context claims for akash org — ক্লায়েন্ট ভিজিট—চট্টগ্রাম (travel ৳5,300: বাস ভাড়া/হোটেল/লোকাল যাতায়াত), নতুন ল্যাপটপ কেনা (office_supplies ৳85,000), অফিস স্টেশনারি (৳2,750), প্রশিক্ষণ ফি—ঢাকা (training ৳13,500 approved), বিদ্যুৎ বিল (utilities ৳8,400 rejected + reviewerNote), মাসিক টিম লাঞ্চ (food ৳5,000 paid + bKash TXN note); 3 submitted/1 approved/1 rejected/1 paid; idempotent (skips when claims exist — verified 2nd run)
- Verification: bunx tsc --noEmit → 0 errors in all expense files (remaining errors are other agents' performance/recruitment folders); bunx eslint on all my files → 0 errors/0 warnings; curl cookie-flow smoke suite all pass: login, GET list (pending-first, summary 3/৳93,050/৳13,500/6), filters (status/category/q-bengali/q-employee-code/employeeId+status combo, invalid category ignored), POST create (totalAmount=Σ items, nested items), POST validation_failed + invalid_employee, GET detail + 404 + 401 unauth, PATCH full lifecycle approve→paid with note-keeping, error paths not_approved/note_required/not_submitted, invalid action zod, DELETE happy + 404 + not_submitted-409, audit rows (expense.claimed/approved/paid/rejected/deleted) verified then test data + test audit rows cleaned (DB back to 6 seeded claims); dev.log clean (zero errors); did NOT touch shared files (i18n/index.ts, [feature]/page.tsx, schema.prisma, features.ts) and did NOT run git commit

Stage Summary:
- Files created (17): 2 i18n dicts, 2 API _lib, 2 route files (claims, claims/[id]), 11 components in components/portal/expenses/ (ExpenseModule default export + claims-tab, pending-tab, claim-card, claim-form-dialog, items-editor, employee-combobox, claim-review-dialog, claims-filters, use-claim-actions, types, utils), 1 seed script
- API endpoints (all org-scoped, ok/fail envelope, audit-logged mutations): GET+POST /api/org/expenses/claims; GET+PATCH+DELETE /api/org/expenses/claims/[id]
- Integration notes for CTO: register bnPortalExpense/enPortalExpense in src/lib/i18n/index.ts (portal.expense namespace); add `expense: ExpenseModule` to MODULES registry in src/app/portal/[orgId]/[feature]/page.tsx (default export from components/portal/expenses/ExpenseModule, no props); query keys ["org","expense",...] — invalidate prefix ["org","expense"] on mutations (already done internally); seed already run (6 claims live)
- Deviations: claim-form-dialog is 274 lines (extracted EmployeeCombobox/ItemsEditor to keep it lean; reference leave dialog is 434); mark_paid-without-note preserves the original approval note (documented in route comment)

---
Task ID: 3-performance
Agent: Performance module builder
Task: Goals tracking + employee appraisals module (API + UI + seed)

Work Log:
- Read worklog + studied leave module API/UI conventions (requireOrg, ok/fail, audit, zod codes, LeaveModule structure, i18n dict shape)
- Built API _lib (helpers: GOAL/APPRAISAL includes, goal computed rows w/ progress%+overdue+dueSoon+daysRemaining, 5 fixed criteria order, overall score avg; schemas: zod create/patch for goals + appraisals with machine-readable codes)
- Built 4 API routes: goals list/create, goals/[id] patch (progress auto-complete at target, active→completed|cancelled) + delete (active only), appraisals list (8/page, in_review-first, summary counts) /create (period unique per employee, items optional→defaults 5 criteria @3), appraisals/[id] detail + patch (item upsert, notes, draft→in_review→final, final locked, overall recomputed)
- Built UI: PerformanceModule (default export, tabs লক্ষ্য/মূল্যায়ন, tab-aware stats row), goals-tab (chips incl. overdue filter, search, pf-scrollbar list), goal-card (progress bar, unit-aware values formatBdt/টাকা, due pill + overdue badge, weight dots, action dropdown), goal-form-dialog (RHF+zod, employee combobox, unit/weight selects), goal-progress-dialog (slider+number, before/after bars, auto-complete hint), appraisals-tab (chips/search/pagination), appraisal cards w/ score stars, appraisal-form-dialog, appraisal-review-dialog (5 Bengali criteria rows + star ratings + comments, live overall, reviewer note, submit→finalize flow, locked read-only), star-rating (44px radio-group), employee-combobox (shared), types (performanceKeys factory), utils (badges, criterion labels, score→color, unit formatting, error map)
- i18n dicts bn/en (portal.performance.* namespace, Bengali default)
- Seed script scripts/seed-performance.ts (8 goals mixed, 1 overdue active; 4 appraisals 1 draft/1 in_review/2 final 2026-H1+2025-H2) — run + idempotency re-run verified
- Smoke-tested all endpoints with curl (login → goals CRUD incl. autoComplete, not_active guards, appraisals save/submit/finalize/locked/invalid_transition/period_taken) then cleaned test rows
- Fixed lint: replaced setState-in-effect patterns with keyed-remount/useState-initializer seeding; extracted shared EmployeeCombobox

Stage Summary:
- Files created (19): API — src/app/api/org/performance/_lib/{helpers,schemas}.ts, goals/route.ts, goals/[id]/route.ts, appraisals/route.ts, appraisals/[id]/route.ts; UI — src/components/portal/performance/{PerformanceModule.tsx, goals-tab, goal-card, goal-form-dialog, goal-progress-dialog, appraisals-tab, appraisal-form-dialog, appraisal-review-dialog, star-rating, employee-combobox, types.ts, utils.ts}; i18n — src/lib/i18n/{bn,en}-portal-performance.ts; seed — scripts/seed-performance.ts
- API endpoints (org-scoped, ok/fail envelope, audit-logged): GET+POST /api/org/performance/goals; PATCH+DELETE /api/org/performance/goals/[id]; GET+POST /api/org/performance/appraisals; GET+PATCH /api/org/performance/appraisals/[id]
- Verification: bunx tsc --noEmit → 0 errors in performance files (remaining repo errors belong to parallel recruitment agent, since fixed); bun run lint → 0 errors/0 warnings in performance files (only pre-existing warning in employees-view.tsx); curl smoke tests all pass; seed run (8 goals + 4 appraisals live on "akash" org, idempotent)
- Integration notes for CTO: register bnPortalPerformance/enPortalPerformance in src/lib/i18n/index.ts under portal.performance; add `performance: PerformanceModule` to MODULES registry in src/app/portal/[orgId]/[feature]/page.tsx (default export from components/portal/performance/PerformanceModule, no props); query key prefix ["org","performance"] invalidated internally on all mutations; goal "overdue" is computed (status active + dueDate<today) and also exposed as a list filter status=overdue; schema untouched
- Deviations: 5 files are 300-350 lines (goal-form-dialog 351, appraisal-review-dialog 330, goals-tab 319, appraisals-tab 303) — same range as the reference leave module's own dialogs/tabs (create-request-dialog 434, requests-tab 321); seed script is 278 lines (data literals, ref prisma/seed.ts is 638); appraisal overallScore = equal-weight average of item scores (items carry no per-criterion weight in schema)

---
Task ID: 3-recruitment
Agent: Recruitment module builder
Task: Recruitment module — job postings, application pipeline, interview scheduling

Work Log:
- Read worklog + leave-module reference contracts (API _lib helpers/schemas, requireOrg/ok-fail envelope, audit, LeaveModule UI structure, i18n dict shape, format.ts, fetcher, features.ts, [feature]/page.tsx MODULES registry — untouched)
- i18n: created src/lib/i18n/bn-portal-recruitment.ts + en-portal-recruitment.ts (210 symmetric keys: jobs/applications/stage/interviews/toasts/errors/time/validation) — flat keys accessed as t("portal.recruitment.*"); CTO registers in index.ts
- API _lib: helpers.ts (STAGE_TRANSITIONS state machine applied→screening→interview→offer→hired|rejected, STAGE_RANK sort, includes, verifyJobRelations org-scoped, parseLocalDateTime, upcomingInterviewCount) + schemas.ts (zod v4: job create/patch, application create/patch w/ BD phone regex + BDT salary caps, interview create/patch, zodRecruitmentError flattening)
- Routes: jobs GET (status/q/departmentId filters + _count applications, open-first) + POST (relation + past_closes_at guards); jobs/[id] GET (detail+applications) PATCH (fields/status) DELETE (in_use 409); applications GET (stage/jobPostingId/q, 12/page, pipeline-order sort, summary {openJobs,activePipeline,upcomingInterviews,hired}) + POST (job_closed 409); applications/[id] GET (detail+interviews) PATCH (state-machine validated stage/rating 0-5/notes, invalid_stage + terminal_stage 409) DELETE (not_in_applied 409); interviews GET+POST (future-time guard past_datetime, round_taken 409, terminal apps blocked); interviews/[interviewId] PATCH (feedback/result pending|pass|fail) — all requireOrg, audit-logged (recruitment.*), isPrismaKnownError catches
- UI src/components/portal/recruitment/: RecruitmentModule.tsx (default export, ~164 lines, 2 tabs + 4 StatCards + framer tab fade), jobs-tab (chips/search/dept-select + max-h-34rem pf-scrollbar list), job-card (badges/vacancies/deadline-days/apps count + edit/close/reopen/delete), job-form-dialog (RHF+zod: title/dept/employment/vacancies/description/closing date), applications-tab (stage chips scrollable, job Select, search, pagination, optimistic stage advance/reject with rollback), application-filters, application-card (avatar/salary ৳/stars/stage badge), application-detail-dialog + application-info (profile grid, cover note, 0-5 star rating editor, notes, advance/reject, guarded delete), interview-section + schedule-interview-form (history, feedback/result recording, next-round scheduling), create-application-dialog (walk-in candidates), types.ts (recruitmentKeys factory + endpoints + filters), utils.ts (stage/status/result badges, formatBdPhone 01712-XXXXXX, relativeRecruitmentTime, recruitmentErrorMessage code→i18n)
- Seed: scripts/seed-recruitment.ts — 5 BD-context postings (সিনিয়র মেশিন অপারেটর — ঢাকা / জুনিয়র অ্যাকাউন্টেন্ট / HR অফিসার / মার্চেন্ডাইজার on_hold / সেলস এক্সিকিউটিভ — চট্টগ্রাম closed), 12 applications across all 6 stages with emails/phones/৳25k-60k expectations, 4 interviews (2 future pending, 2 past with feedback+pass); idempotent (skip when postings exist); run: bun scripts/seed-recruitment.ts
- Verification: bunx tsc --noEmit → 0 errors; bunx eslint on my paths → 0 errors/warnings (fixed 2 set-state-in-effect via project's render-phase adjust pattern); API smoke suite 25/25 PASS (login, jobs filters/search/404, applications filters/pagination/summary, state machine invalid_stage/terminal_stage, job_closed/in_use/round_taken/past_datetime/not_in_applied/validation_failed BD-phone, interview schedule + feedback/result, terminal-block); SSR renderToString smoke 9KB OK (temp file deleted); i18n cross-check: 194 used keys resolve in both dicts, bn/en symmetric; DB reseeded to pristine state after tests (recruitment audit rows wiped)
- Ops note: auto dev server was found dead mid-task (no next/bun process); restarted detached several times for smoke tests — EADDRINUSE lines in dev.log are from those restarts, no compile errors

Stage Summary:
- Endpoints (all org-scoped, ok/fail envelope, audit-logged): GET+POST /api/org/recruitment/jobs; GET+PATCH+DELETE /api/org/recruitment/jobs/[id]; GET+POST /api/org/recruitment/applications; GET+PATCH+DELETE /api/org/recruitment/applications/[id]; GET+POST /api/org/recruitment/applications/[id]/interviews; PATCH /api/org/recruitment/applications/[id]/interviews/[interviewId]
- Components: RecruitmentModule (default export, ready for MODULES.recruitment wiring) + 13 subcomponents in components/portal/recruitment/, mobile-first, emerald/amber/violet/teal/rose stage palette (no indigo/blue), dark-mode semantic tokens, skeletons + EmptyState + retry, sonner toasts, pf-scrollbar on long lists, min-h-10 touch targets
- Files created: 16 (8 API, 2 i18n, 1 seed) + 13 UI files, all in owned paths only — shared files untouched
- CTO integration checklist: i18n index.ts dict registration (recruitment key under portal), [feature]/page.tsx MODULES.recruitment = RecruitmentModule, seed already executed (5 jobs/12 apps/4 interviews for akash), invalidate ["org","recruitment"] on related mutations (done internally)

---
Task ID: 3-refactor
Agent: Component splitting refactorer
Task: Split 500+ line components into focused files

Work Log:
- Pure structural pass, ZERO behavior change: all state/queries/mutations stayed in shells; extracted components are presentational with verbatim JSX (same classes, i18n keys, ARIA, handlers); Radix tab unmount semantics preserved by keeping filter state in shells
- PayrollModule.tsx 753 → 287 shell + payroll-overview.tsx 97 (NoteStatCard + stat grid), payslips-tab.tsx 225 (period jumps + status chips/search toolbar + list states + pagination), payslip-card.tsx 90, structures-tab.tsx 71, structure-card.tsx 99, run-payroll-dialog.tsx 91 (generate AlertDialog); STATUS_FILTERS/statusFilterLabel moved to payslips-tab, currentPeriodLocal stays in shell
- payslip-detail-dialog.tsx 360 → 187 + payslip-document.tsx 189 (DocRow/Stamp/fields/org header/earnings/deductions/totals/PF footer moved wholesale; dialog keeps query/mutation/actions/confirm)
- structure-form-dialog.tsx 301 → 179 + structure-rows-editor.tsx 138 (rows grid + percentSum badge + add button; percentSum memo moved with it)
- setup-wizard.tsx 678 → 214 + wizard/ folder: types.ts 13 (ShiftRow/EmpRow), chips-step.tsx 86, step-indicator.tsx 60 (STEP_ICONS/stepMeta moved in), success-screen.tsx 33, steps/{welcome 59, departments 32, designations 32, shifts 101, employees 137, review 65}-step.tsx; shell keeps validateStep/goNext/submitMutation/footer nav; SetupWizard named export unchanged at same path
- employee-form-dialog.tsx 588 → 173 + employee-form/ folder: schema.ts 77 (zod + FormValues + EMPTY), relation-select.tsx 55, personal-info-fields.tsx 109 (names + code/phone/email), job-details-fields.tsx 143 (gender/date/salary + type/status), assignment-fields.tsx 117 (dept/designation/branch/shift)
- org-detail-dialog.tsx 563 → 320 + org-detail-info-card.tsx 91 (InfoRow), org-detail-features-tab.tsx 84 (CATEGORY_ORDER), org-detail-plan-tab.tsx 77, org-detail-danger-tab.tsx 76, org-detail-confirm-dialogs.tsx 76; useRouter impersonation logic + provisioning poll + optimistic toggleFeature intact in shell
- OrgSettingsModule.tsx 506 → 71 + settings/ co-located: profile-card.tsx 127, workweek-card.tsx 108 (DAY_KEYS/dayLabel moved in), payroll-config-card.tsx 86, info-card.tsx 96 (InfoRow), save-footer.tsx 29, use-settings-save.ts 32 (shared PATCH mutation hook)
- create-org-dialog.tsx 501 → 212 + create-org-schema.ts 29 (createSchema/STEP_FIELDS/slugify), create-org-step-indicator.tsx 51, create-org-info-step.tsx 96 (subdomain auto-slug via parent callbacks), create-org-plan-step.tsx 73, create-org-admin-step.tsx 113 (showPassword state kept in shell for cross-step parity), create-org-review-step.tsx 76
- employees-view.tsx 487 → 233 + employees-filters.tsx 91 (STATUS_OPTIONS moved in), employees-table.tsx 87 (useReactTable instance), employees-pagination.tsx 61, employee-columns.tsx 139 (useEmployeeColumns hook, useCallback-stable edit/delete handlers keep the columns memo as stable as before)
- Noted seams NOT split (cohesive as-is): PayrollModule shell 287 (period auto-jump + 3 queries + 2 mutations), org-detail-dialog shell 320 (impersonation + polling + confirm callbacks)
- Verification: bunx tsc --noEmit → 0 errors repo-wide; bun run lint → 0 errors, 1 warning = the pre-existing TanStack useReactTable warning relocated verbatim from employees-view to employees-table (not new); dev.log clean (one transient module-not-found during a mid-edit typo window, fixed immediately); authed curl smoke admin@akash.com → /portal/akash/{payroll,employees,settings} all 200, super admin /admin/organizations 200, /login 200; git status confirms zero changes to do-not-touch paths (dashboard-view, src/app, prisma, src/lib, src/store, ui, leave/attendance/recruitment/performance/expenses); NO git commit

Stage Summary:
- 7 oversized files (4,076 lines) → 7 shells (max 320) + 36 new co-located files, all ≤ 250 lines except the two noted cohesive shells; public surface unchanged (same default/named exports at same paths — portal-chrome, [feature]/page MODULES registry, admin pages all import the same symbols)
- tsc: 0 errors · lint: 0 errors + 1 known relocated warning · smoke: all affected routes 200
- Files touched: 9 modified, 36 created, 0 deleted; work record also at agent-ctx/3-refactor-component-splitting.md

---
Task ID: 3-final
Agent: CTO (main agent)
Task: Phase 3 close-out — integration, dashboard wiring, final QA, handover

Work Log:
- Integrated 3 subagent modules: registered bnPortalRecruitment/Performance/Expense + English mirrors in i18n index; added recruitment/performance/expense to [feature] page MODULES registry
- Component splitting verified via browser QA: payroll (both tabs + stats), employees table, settings cards, admin org-detail dialog (all 4 tabs + feature switches) — all identical behavior post-split
- Dashboard: added "মডিউল অ্যাক্টিভিটি" section — 3 stat cards (recruitment: open jobs/pipeline/upcoming interviews; expenses: pending claims + ৳ amount; performance: active goals + avg progress bar), gated by feature flags, deep-link into module routes
- Final QA (agent-browser, desktop 1280 + mobile 390): landing→login→portal, module routes, stage advance, appraisal dialog (5 criteria stars), claim approve flow, impersonation round-trip, locked-feature view, dark mode, mobile sheet nav
- Commits pushed: fbee1d4 (engineering fixes), 3da2fa3 (App Router refactor), 40969e9 (module schemas), aeb94fb (3 modules, 68 files), 9874f8e (component split + dashboard cards)

═══════════════════════════════════════════════════════════════════════════
PHASE 3 HANDOVER — /home/z/my-project/worklog.md
═══════════════════════════════════════════════════════════════════════════

## 1. বর্তমান অবস্থা (Current Project Status)

**Status: Phase 3 complete — production-grade engineering baseline established.**

- 250+ source files, 26 Prisma models, ~60 API routes, 9 user-facing portal modules
- **Engineering integrity restored**: `ignoreBuildErrors` REMOVED (tsc --noEmit = 0 errors repo-wide), `reactStrictMode: true`, lint 0 errors (1 benign TanStack warning), no sandbox artifacts in repo
- **Proper Next.js App Router**: `/` (landing + auth redirect), `/login`, `/admin/*` (5 pages, server-side SUPER_ADMIN guard), `/portal/[subdomain]/*` (8 static + `[feature]` dynamic routes, server-side org guard, canonical subdomain URLs). SPA/Zustand routing fully removed. loading.tsx/error.tsx boundaries + not-found.tsx in place.
- **Modules live**: HR Core (employees/departments/designations/branches/shifts), Attendance (ZKTeco sync + 30-day matrix), Leave (BD types + approval), Payroll (BD rules + payslips), Recruitment (jobs + pipeline + interviews), Performance (goals + appraisals), Expenses (claims + approval + payment), Settings, Setup Wizard — all bilingual (bn default), mobile-first, demo-seeded
- Component size discipline: all 500+ line files split (largest app file now ~320 lines); 44 focused components extracted
- Demo: super@peopleflow.com/super123 · admin@akash.com/admin123 (Growth plan: all 3 new modules enabled)
- Dev server healthy on :3000; all commits pushed to github.com/sharif418/peopleflow (main)

## 2. লক্ষ্য / সম্পন্ন কাজ / যাচাই (Goals / Completed / Verification)

**Goal: fix the previous engineer's engineering debt, then build Recruitment + Performance + Expenses.**

Completed:
1. next.config.ts fixed (ignoreBuildErrors out, strictMode on) + 5 hidden TS null-guard errors fixed via AuthedContext type
2. Repo hygiene: Caddyfile/.zscripts/download/examples/mini-services/tests untracked + gitignored + tsconfig/eslint excluded
3. Full SPA→App Router migration with server-side guards, layouts, error/loading boundaries, impersonation routing, useLogout hook, admin-ui dialog store
4. Recruitment: 8 API routes (jobs CRUD, applications pipeline with stage machine, interview scheduling/feedback, 409 guards), 14 components (2 tabs, 5 dialogs), 210×2 i18n keys, BD seed (5 jobs, 12 candidates, 4 interviews)
5. Performance: goals API (auto-complete at target, overdue detection), appraisals API (5 fixed criteria, draft→in_review→final, locked finals), 11 components, seeds (8 goals, 4 appraisals)
6. Expenses: claims API (line items, submitted→approved/rejected→paid state machine, pending-first), 12 components, seeds (6 BD-context claims)
7. Component split: PayrollModule 753→287+6, setup-wizard 678→214+9, employee-form 588→173+5, org-detail 563→320+5, OrgSettings 506→71+6, create-org 501→212+6, employees 487→233+4
8. Dashboard module-activity cards (overview API extended: pending claims+amount, open jobs/pipeline/interviews, goals avg progress)

Verification: tsc 0 errors · lint 0 errors · agent-browser E2E all flows above · mobile 390px + dark mode verified · dev.log clean (no runtime errors)

## 3. সমস্যা / ঝুঁকি / পরবর্তী অগ্রাধিকার (Risks & Next-Phase Priorities)

**Known gaps / risks:**
- Demo mode only — Prisma/SQLite control plane; ERPNext live sync (src/server/frappe) still mock. Switch via ERPNEXT_BASE_URL not yet exercised.
- 3 module agents reported a handful of 274–350-line dialog files (cohesive, noted); hr-crud-view (366) and a few 300-340 files remain — under the "500 = refactor" bar but above the 250 comfort zone.
- Employees view has pre-existing TanStack/React-Compiler warning (upstream incompatibility, harmless).
- Feature flags for new modules: starter-plan orgs see locked view (by design); enterprise flags for loans/accounting etc. still placeholders.
- No automated test suite (per project rule: no test code in sandbox phase).

**Next-phase priorities (recommended order):**
1. **ERPNext live sync pilot** — activate frappe client for one org (employees + attendance first), field maps exist in src/server/frappe
2. **Employee self-service portal** (own leave/expense claims, goals view) — BD offices expect ESS on mobile
3. **Loans & Advances module** (BD rules, EMI schedule) — flag exists, high demand
4. **Dashboard deep-charts** (attendance heatmap, salary trend, dept drill-down)
5. **Audit log UI in portal** + notification bell for approvals
6. Performance: 300+ line dialogs fine-split; hr-crud-view split
7. PWA polish (offline attendance punch queue)
