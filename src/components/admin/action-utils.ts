// Audit action → icon / label helpers (client-safe)
import {
  CheckCircle2,
  CreditCard,
  KeyRound,
  LogIn,
  LogOut,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import type { TranslateFn } from "@/lib/i18n"

export const ACTION_ICONS: Record<string, LucideIcon> = {
  "org.created": PlusCircle,
  "org.provisioned": CheckCircle2,
  "org.suspended": PauseCircle,
  "org.activated": PlayCircle,
  "org.deleted": Trash2,
  "org.impersonated": LogIn,
  "plan.changed": CreditCard,
  "feature.enabled": ToggleRight,
  "feature.disabled": ToggleLeft,
  "auth.login": KeyRound,
  "auth.logout": LogOut,
}

/** Resolves a translated action label; falls back to the raw action key. */
export function actionLabel(t: TranslateFn, action: string): string {
  const translated = t(`admin.actions.${action}`)
  return translated === `admin.actions.${action}` ? action : translated
}
