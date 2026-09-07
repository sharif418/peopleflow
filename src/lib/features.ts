// PeopleFlow feature registry — single source of truth for feature gating
import {
  Users,
  CalendarCheck,
  CalendarOff,
  Banknote,
  UserPlus,
  TrendingUp,
  Receipt,
  HandCoins,
  PiggyBank,
  BookOpen,
  Boxes,
  HeartHandshake,
  FolderKanban,
  LifeBuoy,
  Factory,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react"

export type FeatureKey =
  | "hr_core"
  | "attendance"
  | "leave"
  | "payroll"
  | "recruitment"
  | "performance"
  | "expense"
  | "loans"
  | "pf"
  | "accounting"
  | "inventory"
  | "crm"
  | "projects"
  | "helpdesk"
  | "manufacturing"
  | "procurement"

export type FeatureCategory = "hr" | "finance" | "operations"

export interface FeatureDef {
  key: FeatureKey
  icon: LucideIcon
  nameBn: string
  nameEn: string
  descBn: string
  descEn: string
  category: FeatureCategory
}

export const FEATURE_CATEGORY_LABELS: Record<FeatureCategory, { bn: string; en: string }> = {
  hr: { bn: "মানবসম্পদ", en: "Human Resources" },
  finance: { bn: "ফাইন্যান্স", en: "Finance" },
  operations: { bn: "অপারেশনস", en: "Operations" },
}

export const FEATURES: FeatureDef[] = [
  {
    key: "hr_core",
    icon: Users,
    nameBn: "কোর HR",
    nameEn: "HR Core",
    descBn: "কর্মী, ডিপার্টমেন্ট, পদবি, ব্রাঞ্চ ও শিফট ব্যবস্থাপনা",
    descEn: "Employees, departments, designations, branches & shifts",
    category: "hr",
  },
  {
    key: "attendance",
    icon: CalendarCheck,
    nameBn: "হাজিরা",
    nameEn: "Attendance",
    descBn: "বায়োমেট্রিক সিঙ্ক, রিয়েল-টাইম হাজিরা ট্র্যাকিং",
    descEn: "Biometric sync, real-time attendance tracking",
    category: "hr",
  },
  {
    key: "leave",
    icon: CalendarOff,
    nameBn: "ছুটি ব্যবস্থাপনা",
    nameEn: "Leave Management",
    descBn: "ছুটির আবেদন, অনুমোদন ও লিজ/ব্যালেন্স",
    descEn: "Leave requests, approvals & balances",
    category: "hr",
  },
  {
    key: "payroll",
    icon: Banknote,
    nameBn: "পেরোল",
    nameEn: "Payroll",
    descBn: "বেতন হিসাব, শিট জেনারেশন, PF ও ট্যাক্স",
    descEn: "Salary processing, payslips, PF & tax",
    category: "finance",
  },
  {
    key: "recruitment",
    icon: UserPlus,
    nameBn: "নিয়োগ",
    nameEn: "Recruitment",
    descBn: "জব পোস্ট, ক্যান্ডিডেট ট্র্যাকিং, ইন্টারভিউ",
    descEn: "Job posts, candidate tracking, interviews",
    category: "hr",
  },
  {
    key: "performance",
    icon: TrendingUp,
    nameBn: "পারফরম্যান্স",
    nameEn: "Performance",
    descBn: "KPI, অ্যাপ্রাইজাল ও রিভিউ সাইকেল",
    descEn: "KPIs, appraisals & review cycles",
    category: "hr",
  },
  {
    key: "expense",
    icon: Receipt,
    nameBn: "খরচ",
    nameEn: "Expense",
    descBn: "খরচের দাবি, অনুমোদন ও রিপেমেন্ট",
    descEn: "Claims, approvals & reimbursements",
    category: "finance",
  },
  {
    key: "loans",
    icon: HandCoins,
    nameBn: "কর্মী ঋণ",
    nameEn: "Employee Loans",
    descBn: "অ্যাডভান্স ও ঋণের কিস্তি ব্যবস্থাপনা",
    descEn: "Advances & loan installment management",
    category: "finance",
  },
  {
    key: "pf",
    icon: PiggyBank,
    nameBn: "ভবিষ্য তহবিল",
    nameEn: "Provident Fund",
    descBn: "PF চাঁদা, স্টেটমেন্ট ও সেটেলমেন্ট",
    descEn: "PF contributions, statements & settlement",
    category: "finance",
  },
  {
    key: "accounting",
    icon: BookOpen,
    nameBn: "হিসাব",
    nameEn: "Accounting",
    descBn: "লেজার, জার্নাল, ব্যালেন্স শিট",
    descEn: "Ledger, journals, balance sheet",
    category: "finance",
  },
  {
    key: "inventory",
    icon: Boxes,
    nameBn: "ইনভেন্টরি",
    nameEn: "Inventory",
    descBn: "স্টক, ওয়্যারহাউস ও মুভমেন্ট",
    descEn: "Stock, warehouses & movements",
    category: "operations",
  },
  {
    key: "crm",
    icon: HeartHandshake,
    nameBn: "CRM",
    nameEn: "CRM",
    descBn: "লিড, কাস্টমার ও সেলস পাইপলাইন",
    descEn: "Leads, customers & sales pipeline",
    category: "operations",
  },
  {
    key: "projects",
    icon: FolderKanban,
    nameBn: "প্রজেক্ট",
    nameEn: "Projects",
    descBn: "প্রজেক্ট, টাস্ক ও টাইমশিট",
    descEn: "Projects, tasks & timesheets",
    category: "operations",
  },
  {
    key: "helpdesk",
    icon: LifeBuoy,
    nameBn: "হেল্পডেস্ক",
    nameEn: "Helpdesk",
    descBn: "টিকেট ও SLA ব্যবস্থাপনা",
    descEn: "Tickets & SLA management",
    category: "operations",
  },
  {
    key: "manufacturing",
    icon: Factory,
    nameBn: "উৎপাদন",
    nameEn: "Manufacturing",
    descBn: "প্রোডাকশন অর্ডার, BOM ও প্ল্যানিং",
    descEn: "Production orders, BOM & planning",
    category: "operations",
  },
  {
    key: "procurement",
    icon: ShoppingCart,
    nameBn: "প্রকিউরমেন্ট",
    nameEn: "Procurement",
    descBn: "RFQ, সাপ্লায়ার ও ক্রয় অর্ডার",
    descEn: "RFQs, suppliers & purchase orders",
    category: "operations",
  },
]

export const FEATURE_MAP: Record<string, FeatureDef> = Object.fromEntries(
  FEATURES.map((f) => [f.key, f]),
)

// ─── Subscription plans ──────────────────────────────────────────────────────

export type PlanKey = "starter" | "growth" | "enterprise"

export interface PlanDef {
  key: PlanKey
  nameBn: string
  nameEn: string
  priceBdt: number
  maxEmployees: number // -1 = unlimited
  features: FeatureKey[]
  highlight?: boolean
  taglineBn: string
  taglineEn: string
}

export const PLANS: PlanDef[] = [
  {
    key: "starter",
    nameBn: "স্টার্টার",
    nameEn: "Starter",
    priceBdt: 999,
    maxEmployees: 50,
    features: ["hr_core", "attendance", "leave"],
    taglineBn: "ছোট অফিসের জন্য শুরু করার প্ল্যান",
    taglineEn: "Get started for small offices",
  },
  {
    key: "growth",
    nameBn: "গ্রোথ",
    nameEn: "Growth",
    priceBdt: 2499,
    maxEmployees: 250,
    features: ["hr_core", "attendance", "leave", "payroll", "recruitment", "expense", "performance"],
    highlight: true,
    taglineBn: "গ্রোয়িং কোম্পানির জন্য সবচেয়ে জনপ্রিয়",
    taglineEn: "Most popular for growing companies",
  },
  {
    key: "enterprise",
    nameBn: "এন্টারপ্রাইজ",
    nameEn: "Enterprise",
    priceBdt: 7999,
    maxEmployees: -1,
    features: [
      "hr_core",
      "attendance",
      "leave",
      "payroll",
      "recruitment",
      "performance",
      "expense",
      "loans",
      "pf",
      "accounting",
      "inventory",
      "crm",
      "projects",
      "helpdesk",
      "manufacturing",
      "procurement",
    ],
    taglineBn: "সম্পূর্ণ ERP — সব ফিচার আনলিমিটেড",
    taglineEn: "Complete ERP — every feature, unlimited",
  },
]

export const PLAN_MAP: Record<string, PlanDef> = Object.fromEntries(PLANS.map((p) => [p.key, p]))

export function planFor(key: string): PlanDef {
  return PLAN_MAP[key] ?? PLANS[0]
}

export function defaultFlagsForPlan(planKey: string): Record<string, boolean> {
  const plan = planFor(planKey)
  const flags: Record<string, boolean> = {}
  for (const f of FEATURES) {
    flags[f.key] = plan.features.includes(f.key)
  }
  return flags
}

// Provisioning steps (simulated ERPNext site creation timeline, used by admin UI)
export const PROVISION_STEPS = [
  { key: "site", bn: "ERPNext সাইট তৈরি হচ্ছে", en: "Creating ERPNext site", ms: 2000 },
  { key: "frappe", bn: "Frappe Framework ইনস্টল হচ্ছে", en: "Installing Frappe Framework", ms: 4000 },
  { key: "erpnext", bn: "ERPNext অ্যাপ ইনস্টল হচ্ছে", en: "Installing ERPNext app", ms: 6500 },
  { key: "hrms", bn: "HRMS মডিউল ইনস্টল হচ্ছে", en: "Installing HRMS module", ms: 8500 },
  { key: "db", bn: "PostgreSQL ডেটাবেস কনফিগার হচ্ছে", en: "Configuring PostgreSQL database", ms: 10500 },
  { key: "api", bn: "API কী ও ইউজার তৈরি হচ্ছে", en: "Creating API keys & admin user", ms: 12000 },
]

export const PROVISION_TOTAL_MS = PROVISION_STEPS[PROVISION_STEPS.length - 1].ms
