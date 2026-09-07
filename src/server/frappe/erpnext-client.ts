// Real Frappe REST client (production mode — activated via ERPNEXT_BASE_URL).
// Auth: token-based (Authorization: token apiKey:apiSecret) created for the
// PeopleFlow integration user on each ERPNext site (see deploy/provision-site.sh).
//
// Frappe REST API reference: https://docs.frappe.io/framework/user/en/desk/api

import type {
  FrappeClient,
  FrappeDoc,
  FrappeListOptions,
  FrappePaginated,
} from "./types"

interface ErpNextConfig {
  baseUrl: string
  apiKey: string
  apiSecret: string
}

function buildQuery(options?: FrappeListOptions): string {
  const params = new URLSearchParams()
  if (options?.filters) params.set("filters", JSON.stringify(options.filters))
  if (options?.fields) params.set("fields", JSON.stringify(options.fields))
  if (options?.limit) params.set("limit", String(options.limit))
  if (options?.offset) params.set("limit_start", String(options.offset))
  if (options?.orderBy) params.set("order_by", options.orderBy)
  return params.toString()
}

export class ErpNextClient implements FrappeClient {
  private cfg: ErpNextConfig

  constructor(cfg: ErpNextConfig) {
    // normalize: strip trailing slash
    this.cfg = { ...cfg, baseUrl: cfg.baseUrl.replace(/\/$/, "") }
  }

  private headers(): HeadersInit {
    return {
      Authorization: `token ${this.cfg.apiKey}:${this.cfg.apiSecret}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.cfg.baseUrl}${path}`, {
      ...init,
      headers: this.headers(),
      cache: "no-store",
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`Frappe API ${res.status} ${path}: ${body.slice(0, 200)}`)
    }
    return (await res.json()) as T
  }

  async ping(): Promise<{ ok: boolean; version?: string; message?: string }> {
    try {
      const out = await this.request<{ message?: { version?: string } }>(
        "/api/method/frappe.client.get_server_info",
      )
      return { ok: true, version: out.message?.version }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "unreachable" }
    }
  }

  async getDocList(doctype: string, options?: FrappeListOptions): Promise<FrappePaginated> {
    const qs = buildQuery(options)
    const out = await this.request<{ data: FrappeDoc[] } & Record<string, unknown>>(
      `/api/resource/${encodeURIComponent(doctype)}${qs ? `?${qs}` : ""}`,
    )
    return { data: out.data ?? [], total: Number(out.data?.length ?? 0) }
  }

  async getDoc(doctype: string, name: string): Promise<FrappeDoc> {
    return this.request<FrappeDoc>(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`)
  }

  async createDoc(doctype: string, values: Record<string, unknown>): Promise<FrappeDoc> {
    return this.request<FrappeDoc>(`/api/resource/${encodeURIComponent(doctype)}`, {
      method: "POST",
      body: JSON.stringify(values),
    })
  }

  async updateDoc(doctype: string, name: string, values: Record<string, unknown>): Promise<FrappeDoc> {
    return this.request<FrappeDoc>(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      { method: "PUT", body: JSON.stringify(values) },
    )
  }

  async deleteDoc(doctype: string, name: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    )
  }

  async callMethod(method: string, payload?: Record<string, unknown>): Promise<unknown> {
    const qs = payload
      ? `?${new URLSearchParams(Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])))}`
      : ""
    return this.request<unknown>(`/api/method/${method}${qs}`)
  }
}
