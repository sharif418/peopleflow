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
