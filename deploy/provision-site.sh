#!/usr/bin/env bash
# PeopleFlow — provision a new tenant ERPNext site (one per organization)
# Usage (inside the backend container):
#   ./provision-site.sh <subdomain> <admin-password> [plan-key]
#
# Creates:  {subdomain}.peopleflow.com  (PostgreSQL, erpnext + hrms, Bengali default)
# Outputs:  API key/secret for the PeopleFlow integration user (print once).
set -euo pipefail

SUBDOMAIN="${1:?Usage: provision-site.sh <subdomain> <admin-password> [plan]}"
ADMIN_PASSWORD="${2:?admin password required}"
SITE="${SUBDOMAIN}.peopleflow.com"

echo "▶ Creating site ${SITE} …"
bench new-site "${SITE}" \
  --db-type postgres \
  --admin-password "${ADMIN_PASSWORD}" \
  --install-app erpnext \
  --install-app hrms \
  --set-default-language bn

echo "▶ Enabling API access for integration user …"
bench --site "${SITE}" execute frappe.core.doctype.user.user.create_user \
  --args '["peopleflow@peopleflow.com"]' || true
bench --site "${SITE}" set-password peopleflow@peopleflow.com "${ADMIN_PASSWORD}"

# generate API key/secret for the integration user
bench --site "${SITE}" execute peopleflow.provisioning.generate_api_secrets \
  --args '["peopleflow@peopleflow.com"]' 2>/dev/null || \
cat <<'NOTE'
NOTE
echo "▶ ${SITE} provisioned."
echo "  Add DNS:  ${SITE} → this server, then run:"
echo "  bench setup add-domain ${SITE} --site ${SITE} (if using the internal traefik)"
