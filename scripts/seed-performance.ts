// Performance module seed — run: bun scripts/seed-performance.ts
// Seeds demo goals + appraisals for the "akash" demo org. Idempotent:
// skips goals/appraisals when they already exist for the org.
import { db } from "@/lib/db"

// ─── Date helpers (local ISO) ─────────────────────────────────────────────────
function localIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function daysFromNow(n: number): string {
  return localIso(new Date(Date.now() + n * 24 * 60 * 60 * 1000))
}

// ─── Goal seeds (8: mixed progress, one overdue, two completed, one cancelled) ─
const GOALS: Array<{
  code: string
  title: string
  description: string
  unit: string
  target: number
  current: number
  start: number
  due: number
  weight: number
  status: string
}> = [
  {
    code: "PF-0004",
    title: "মাসিক উৎপাদন লক্ষ্য",
    description: "লাইন-১ ও লাইন-২ মিলিয়ে মাসে ১২,০০০ পিস পোশাক উৎপাদন",
    unit: "ইউনিট",
    target: 12000,
    current: 9240,
    start: -12,
    due: 18,
    weight: 5,
    status: "active",
  },
  {
    code: "PF-0006",
    title: "কাস্টমার স্যাটিসফ্যাকশন",
    description: "কোয়ালিটি ইনস্পেকশন পাস করা পন্যের অনুপাত ৯০% এ ধরে রাখা",
    unit: "%",
    target: 90,
    current: 90,
    start: -60,
    due: -5,
    weight: 4,
    status: "completed",
  },
  {
    code: "PF-0002",
    title: "নতুন ক্লায়েন্ট অনবোর্ডিং",
    description: "এই কোয়ার্টারে অন্তত ৫টি নতুন বায়ার অনবোর্ড করা",
    unit: "ইউনিট",
    target: 5,
    current: 3,
    start: -40,
    due: 25,
    weight: 4,
    status: "active",
  },
  {
    code: "PF-0013",
    title: "বিক্রয় লক্ষ্য",
    description: "স্থানীয় বাজারে চলতি সেমিস্টারের বিক্রয় লক্ষ্যমাত্রা",
    unit: "টাকা",
    target: 500000,
    current: 320000,
    start: -70,
    due: 35,
    weight: 3,
    status: "active",
  },
  {
    code: "PF-0005",
    title: "ডেলিভারি লিড টাইম কমানো",
    description: "অর্ডার থেকে ডেলিভারির সময় ৩০% কমানো — মেয়াদ পেরিয়ে গেছে",
    unit: "%",
    target: 30,
    current: 18,
    start: -80,
    due: -9,
    weight: 3,
    status: "active", // overdue: active + dueDate < today
  },
  {
    code: "PF-0011",
    title: "রিটার্ন রেট কমানো",
    description: "বায়ার রিটার্ন হার ৫% থেকে ২.৫% এ নামানো (৫০% কমানো)",
    unit: "%",
    target: 50,
    current: 50,
    start: -90,
    due: -15,
    weight: 2,
    status: "completed",
  },
  {
    code: "PF-0007",
    title: "নতুন অপারেটর ট্রেনিং",
    description: "প্রোডাকশন ফ্লোরে ২০ জন নতুন অপারেটর প্রশিক্ষণ সম্পন্ন করানো",
    unit: "ইউনিট",
    target: 20,
    current: 12,
    start: -30,
    due: 45,
    weight: 2,
    status: "active",
  },
  {
    code: "PF-0009",
    title: "স্টোর ইনভেন্টরি অডিট",
    description: "কোয়ার্টার শেষে ১০০% স্টক গণনা — পরিকল্পনা বাতিল",
    unit: "ইউনিট",
    target: 100,
    current: 45,
    start: -45,
    due: 10,
    weight: 1,
    status: "cancelled",
  },
]

// ─── Appraisal seeds (1 draft, 1 in_review, 2 final) ─────────────────────────
interface ItemSeed {
  criterion: string
  score: number
  comment: string | null
}

const APPRAISALS: Array<{
  code: string
  period: string
  status: string
  selfNote: string | null
  reviewerNote: string | null
  items: ItemSeed[]
}> = [
  {
    code: "PF-0004",
    period: "2026-H2",
    status: "draft",
    selfNote: "নতুন লাইন সেটআপে সাহায্য করেছি, কাজের চাপ একটু বেশি ছিল।",
    reviewerNote: null,
    items: [
      { criterion: "quality", score: 4, comment: "স্যাম্পল পাস রেট ভালো" },
      { criterion: "punctuality", score: 4, comment: null },
      { criterion: "teamwork", score: 3, comment: null },
      { criterion: "leadership", score: 3, comment: null },
      { criterion: "goal_achievement", score: 4, comment: null },
    ],
  },
  {
    code: "PF-0005",
    period: "2026-H2",
    status: "in_review",
    selfNote: "লিড টাইম কমানোর কাজটা আটকে গেছে, নতুন মেশিন লাগবে।",
    reviewerNote: null,
    items: [
      { criterion: "quality", score: 4, comment: "কাজের গুণমান নিয়মিত ভালো" },
      { criterion: "punctuality", score: 3, comment: "মাঝে মাঝে দেরিতে আসেন" },
      { criterion: "teamwork", score: 4, comment: "লাইন চিফদের সাথে সমন্বয় ভালো" },
      { criterion: "leadership", score: 3, comment: null },
      { criterion: "goal_achievement", score: 2, comment: "লিড টাইম লক্ষ্য এখনো অর্জিত হয়নি" },
    ],
  },
  {
    code: "PF-0001",
    period: "2026-H1",
    status: "final",
    selfNote: "নতুন বায়ার যোগ হওয়ায় কাজের পরিধি বেড়েছে।",
    reviewerNote: "সামগ্রিকভাবে চমৎকার পারফরম্যান্স — প্রমোশনের জন্য বিবেচিত।",
    items: [
      { criterion: "quality", score: 5, comment: "অসাধারণ মানের নিয়ন্ত্রণ" },
      { criterion: "punctuality", score: 5, comment: null },
      { criterion: "teamwork", score: 4, comment: "সব বিভাগের সাথে সমন্বয় দক্ষ" },
      { criterion: "leadership", score: 5, comment: "টিমকে দিকনির্দেশনা দেওয়ায় সেরা" },
      { criterion: "goal_achievement", score: 4, comment: "H1 এর লক্ষ্য প্রায় পূরণ" },
    ],
  },
  {
    code: "PF-0006",
    period: "2025-H2",
    status: "final",
    selfNote: null,
    reviewerNote: "কোয়ালিটি বিভাগে ধারাবাহিক উন্নতি — ধরে রাখতে হবে।",
    items: [
      { criterion: "quality", score: 4, comment: "ইনস্পেকশন রিপোর্ট সন্তোষজনক" },
      { criterion: "punctuality", score: 4, comment: null },
      { criterion: "teamwork", score: 3, comment: null },
      { criterion: "leadership", score: 3, comment: "সুপারভাইজার হিসেবে সম্ভাবনা আছে" },
      { criterion: "goal_achievement", score: 4, comment: "রিটার্ন রেট লক্ষ্য পূরণ" },
    ],
  },
]

async function main() {
  console.log("🌱 Seeding performance module (org: akash)…")

  const org = await db.organization.findUnique({ where: { subdomain: "akash" } })
  if (!org) {
    console.error("✗ Demo org 'akash' not found — run `bun prisma/seed.ts` first.")
    process.exit(1)
  }

  const employees = await db.employee.findMany({
    where: { organizationId: org.id },
    select: { id: true, employeeCode: true },
  })
  const byCode = new Map(employees.map((e) => [e.employeeCode, e]))

  // ── Goals ──
  const goalCount = await db.goal.count({ where: { organizationId: org.id } })
  if (goalCount > 0) {
    console.log(`  ↷ goals skipped (${goalCount} already exist)`)
  } else {
    let created = 0
    for (const g of GOALS) {
      const emp = byCode.get(g.code)
      if (!emp) continue
      await db.goal.create({
        data: {
          organizationId: org.id,
          employeeId: emp.id,
          title: g.title,
          description: g.description,
          unit: g.unit,
          targetValue: g.target,
          currentValue: g.current,
          startDate: daysFromNow(g.start),
          dueDate: daysFromNow(g.due),
          weight: g.weight,
          status: g.status,
        },
      })
      created++
    }
    console.log(`  ✓ ${created} goals (active / completed / overdue / cancelled mix)`)
  }

  // ── Appraisals ──
  const appraisalCount = await db.appraisal.count({ where: { organizationId: org.id } })
  if (appraisalCount > 0) {
    console.log(`  ↷ appraisals skipped (${appraisalCount} already exist)`)
  } else {
    let created = 0
    for (const a of APPRAISALS) {
      const emp = byCode.get(a.code)
      if (!emp) continue
      const overall = Math.round((a.items.reduce((acc, i) => acc + i.score, 0) / a.items.length) * 100) / 100
      await db.appraisal.create({
        data: {
          organizationId: org.id,
          employeeId: emp.id,
          period: a.period,
          overallScore: overall,
          status: a.status,
          selfNote: a.selfNote,
          reviewerNote: a.reviewerNote,
          items: { create: a.items },
        },
      })
      created++
    }
    console.log(`  ✓ ${created} appraisals (draft / in_review / final mix)`)
  }

  console.log("🌱 Performance seed complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
