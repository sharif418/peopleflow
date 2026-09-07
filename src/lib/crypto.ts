// Pure crypto helpers (no next/* imports — usable from scripts/seed too)
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto"

const SECRET = process.env.AUTH_SECRET || "peopleflow-dev-secret-change-in-production"

// ─── Password hashing (scrypt) ───────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, "hex")
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

// ─── Signed tokens (HMAC-SHA256) ─────────────────────────────────────────────

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url")
}

export function signToken(payload: string, ttlMs: number): string {
  const exp = Date.now() + ttlMs
  const body = `${Buffer.from(payload).toString("base64url")}.${exp}`
  return `${body}.${sign(body)}`
}

export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [payloadB64, exp, sig] = parts
  const body = `${payloadB64}.${exp}`
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (Number(exp) < Date.now()) return null
  return Buffer.from(payloadB64, "base64url").toString("utf8")
}
