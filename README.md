# PeopleFlow v2 🇧🇩

**বাংলাদেশের প্রতিটা অফিসের ডিজিটাল ব্যাকবোন** — HR, Payroll, Attendance, Accounting, Inventory, সব এক প্ল্যাটফর্মে।

Bangladesh's office management SaaS: a custom **Next.js 16** frontend on top of an **ERPNext + Frappe HRMS** backend engine.

---

## 🎯 Phase 1 (current)

| Capability | Status |
| --- | --- |
| Custom Next.js 16 frontend (mobile-first, বাংলা + English) | ✅ |
| Super Admin panel (organizations, provisioning, plans, feature gating, impersonation, health, audit) | ✅ |
| Organization portal (setup wizard, dashboard, HR Core CRUD) | ✅ |
| Feature gating system (16 modules, 3 plans) | ✅ |
| Auth with sessions + scrypt hashing + impersonation | ✅ |
| ERPNext integration layer (Frappe REST client + deploy assets) | ✅ code-ready |
| Live ERPNext deployment on Coolify/Contabo | 🔜 Phase 2 |

> **Demo mode:** until `ERPNEXT_BASE_URL` is configured, the control-plane SQLite DB
> simulates the ERPNext backend (including the ~12s site-provisioning timeline).
> Flip the env vars to go live — see `docs/ERPNEXT-SETUP.md`.

## 🔐 Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Super Admin (platform owner) | `super@peopleflow.com` | `super123` |
| HR Admin (আকাশ গার্মেন্টস) | `admin@akash.com` | `admin123` |

## 🧱 Architecture

```
Browser ── Next.js 16 SPA (bn/en, single page app, PWA manifest)
              │
              │  /api/*  (Next.js API routes → control plane)
              ▼
        Control plane (Prisma + SQLite): tenants, users, plans,
        feature flags, sessions, HR data
              │
              │  Frappe REST API (token auth) — src/server/frappe/
              ▼
        ERPNext + HRMS sites (one per org → full data isolation, PostgreSQL)
```

- End users **never see** the ERPNext Desk UI.
- `deploy/` + `docs/ERPNEXT-SETUP.md` = frappe_docker compose (PostgreSQL), tenant
  provisioning script, and the production runbook for Coolify.

## 📦 Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Zustand ·
TanStack Query + Table · React Hook Form + Zod · Recharts · Framer Motion ·
Prisma (SQLite control plane) · next-themes · sonner · PWA manifest

## 🚀 Run locally

```bash
bun install
bun run db:push          # create SQLite schema
bun prisma/seed.ts       # demo data (4 orgs, employees, invoices)
bun run dev              # http://localhost:3000
```

Environment: copy `.env.example` → `.env` (`DATABASE_URL`, `AUTH_SECRET`).

## 🗂 Key folders

```
src/app/page.tsx            SPA shell (landing / login / admin / portal)
src/app/api/auth/*          sessions, impersonation
src/app/api/admin/*         super-admin APIs (stats, orgs, plans, health, audit)
src/app/api/org/*           org portal APIs (HR Core CRUD, setup, overview)
src/components/admin/**     Super Admin panel UI
src/components/portal/**    Organization portal UI
src/lib/features.ts         16-feature registry + plans (gating source of truth)
src/lib/i18n/*              বাংলা + English dictionaries
src/server/frappe/*         Frappe REST client (production integration)
deploy/ docs/               ERPNext deployment assets
prisma/                     schema + seed
```

## 🗺 Roadmap

- **Phase 2:** ERPNext deploy on Contabo (Coolify), live sync, per-tenant DNS
- **Phase 3:** Attendance (ZKTeco biometric sync), Leave, Payroll (BD rules: PF, festivals)
- **Phase 4:** Accounting, Inventory, CRM, Projects, mobile PWA offline mode

---

Made in Bangladesh 🇧🇩 · PeopleFlow
