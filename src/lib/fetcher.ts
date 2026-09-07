// Typed API fetch helper — expects { ok, data } / { ok, error } envelope
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (init?.body) headers["Content-Type"] = "application/json"
  if (init?.headers) Object.assign(headers, init.headers)

  const res = await fetch(path, { ...init, headers })
  let json: { ok?: boolean; data?: T; error?: string } | null = null
  try {
    json = (await res.json()) as { ok?: boolean; data?: T; error?: string }
  } catch {
    /* non-json response */
  }
  if (!json || json.ok !== true) {
    throw new Error(json?.error ?? `Request failed (${res.status})`)
  }
  return json.data as T
}
