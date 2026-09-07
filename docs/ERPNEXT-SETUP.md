# ERPNext Backend Setup — PeopleFlow v2

> Phase 1 ships the **frontend + control-plane + integration code**. Actual server deployment
> happens on the Contabo VPS (207.180.198.236, Coolify) in the **deploy phase**. This document
> is the runbook.

## Architecture

```
Browser ── Next.js 16 (custom UI, bn/en, mobile-first)
              │
              │  Frappe REST API  (token auth)
              ▼
        ERPNext + Frappe HRMS  (per-tenant sites)
              │
        PostgreSQL 16  (one DB per tenant → full data isolation)
```

- **Control plane** (this Next.js app + Prisma): tenant registry, users, plans, feature flags,
  sessions. Source of truth for who gets what.
- **ERPNext sites**: `akkash.peopleflow.com`, `dhakatech.peopleflow.com`, … each an isolated
  Frappe site with `erpnext` + `hrms` apps installed.
- The end user **never sees** the ERPNext Desk UI — every interaction goes through our
  custom Next.js frontend.

## 1. Deploy ERPNext on Coolify

```bash
# On the Coolify dashboard: New Resource → Docker Compose (empty)
# paste deploy/docker-compose.yml
# set env: ADMIN_PASSWORD, POSTGRES_PASSWORD
```

or from a shell:

```bash
git clone https://github.com/sharif418/peopleflow
cd peopleflow/deploy
ADMIN_PASSWORD=… POSTGRES_PASSWORD=… docker compose up -d
```

The `create-site` one-shot job creates the bootstrap site
`peopleflow.ailearnersbd.com` (PostgreSQL, Bengali default language).

## 2. Provision a tenant site

```bash
docker compose exec backend bash
cd /home/frappe/frappe-bench
./deploy/provision-site.sh akash 'strong-password'
```

What it does:

1. `bench new-site akash.peopleflow.com --db-type postgres --install-app erpnext --install-app hrms`
2. creates `peopleflow@peopleflow.com` integration user + API key/secret
3. DNS: point `*.peopleflow.com` (or your domain) → the server IP

## 3. Point the Next.js app at ERPNext

```env
ERPNEXT_BASE_URL=https://api.peopleflow.com   # or per-tenant base resolved from subdomain
ERPNEXT_API_KEY=…
ERPNEXT_API_SECRET=…
ERPNEXT_SYNC_ENABLED=true
```

Code entry points:

| File | Purpose |
| --- | --- |
| `src/server/frappe/erpnext-client.ts` | Real Frappe REST client (resource CRUD + methods) |
| `src/server/frappe/types.ts` | Client contract + doctype map (`Employee`, `Department`, …) |
| `src/server/frappe/index.ts` | Factory + PeopleFlow↔ERPNext field mapping |
| `src/lib/api-utils.ts` | Provisioning state machine (simulated until sync enabled) |

With `ERPNEXT_BASE_URL` unset (current sandbox/demo), the platform runs in
**mock backend mode**: all data is served from the control-plane SQLite DB and the
provisioning timeline is simulated. Flip the env vars to switch to live ERPNext.

## 4. Verify the REST API

```bash
# health
curl -s https://peopleflow.ailearnersbd.com/api/method/frappe.client.get_server_info \
  -H "Authorization: token $KEY:$SECRET"

# list employees
curl -s 'https://akkash.peopleflow.com/api/resource/Employee?limit=10' \
  -H "Authorization: token $KEY:$SECRET"
```

## 5. Multi-tenant notes

- One PostgreSQL **database per site** (Frappe standard) → tenants are fully isolated.
- `deploy/docker-compose.yml` mounts one bench; extra sites = extra rows in `bench`
  (no new containers needed until load demands it).
- TLS: terminate at Coolify proxy or the bundled traefik (`webserver` service).
- Scaling later: split tenants across multiple VPSes; the control plane stays central.

## Reference repos

- frappe_docker: https://github.com/frappe/frappe_docker
- ERPNext: https://github.com/frappe/erpnext
- HRMS: https://github.com/frappe/hrms
- frappe-react-sdk: https://github.com/frappe/frappe-react-sdk
- frappe-js-sdk: https://github.com/frappe/frappe-js-sdk
