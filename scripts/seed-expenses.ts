// Seed demo expense claims for the demo org (subdomain "akash").
// Run: bun scripts/seed-expenses.ts — idempotent (skips if claims exist).
import { db } from "@/lib/db"

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS)
}

function isoDaysAgo(n: number): string {
  const d = daysAgo(n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

interface SeedItem {
  label: string
  amount: number
  note?: string
}

interface SeedClaim {
  employeeCode: string
  title: string
  category: string
  expenseDaysAgo: number
  description: string
  status: string
  reviewerNote: string | null
  reviewedDaysAgo: number | null
  createdDaysAgo: number
  items: SeedItem[]
}

const CLAIMS: SeedClaim[] = [
  {
    employeeCode: "PF-0004",
    title: "ক্লায়েন্ট ভিজিট — চট্টগ্রাম",
    category: "travel",
    expenseDaysAgo: 3,
    description: "ক্লায়েন্ট মিটিং ও নমুনা ডেলিভারির জন্য দুই দিনের ট্রিপ",
    status: "submitted",
    reviewerNote: null,
    reviewedDaysAgo: null,
    createdDaysAgo: 1,
    items: [
      { label: "বাস ভাড়া (ঢাকা–চট্টগ্রাম গো-ব্যাক)", amount: 1200, note: "শ্যামলী পরিবহন, রিটার্ন টিকিট" },
      { label: "হোটেল ভাড়া", amount: 3500, note: "১ রাত — হোটেল আফতাব, আগ্রাবাদ" },
      { label: "লোকাল যাতায়াত", amount: 600, note: "সিএনজি ও রিকশা" },
    ],
  },
  {
    employeeCode: "PF-0013",
    title: "নতুন ল্যাপটপ কেনা",
    category: "office_supplies",
    expenseDaysAgo: 2,
    description: "হিসাব বিভাগের জন্য নতুন ল্যাপটপ — পুরোনোটি মেরামত-অযোগ্য",
    status: "submitted",
    reviewerNote: null,
    reviewedDaysAgo: null,
    createdDaysAgo: 1,
    items: [
      { label: "ল্যাপটপ (Dell Vostro 3520)", amount: 82000, note: "স্টার টেকনোলজি থেকে কেনা" },
      { label: "ওয়্যারলেস মাউস ও ব্যাগ", amount: 3000 },
    ],
  },
  {
    employeeCode: "PF-0012",
    title: "অফিস স্টেশনারি কেনাকাটা",
    category: "office_supplies",
    expenseDaysAgo: 5,
    description: "মাসিক স্টেশনারি বাবদ বিল",
    status: "submitted",
    reviewerNote: null,
    reviewedDaysAgo: null,
    createdDaysAgo: 2,
    items: [
      { label: "রিম কাগজ (৫টি)", amount: 1800, note: "অফিস ফাইল ও প্রিন্টিং" },
      { label: "কলম, ফাইল ও রেজিস্টার", amount: 950 },
    ],
  },
  {
    employeeCode: "PF-0006",
    title: "প্রশিক্ষণ ফি — ঢাকা",
    category: "training",
    expenseDaysAgo: 12,
    description: "কোয়ালিটি কন্ট্রোল সার্টিফিকেশন কোর্স",
    status: "approved",
    reviewerNote: "অনুমোদিত — Q3 প্রশিক্ষণ বাজেটে আছে",
    reviewedDaysAgo: 3,
    createdDaysAgo: 9,
    items: [
      { label: "কোর্স ফি", amount: 12000, note: "ISO 9001 QC কোর্স" },
      { label: "যাতায়াত", amount: 1500 },
    ],
  },
  {
    employeeCode: "PF-0005",
    title: "বিদ্যুৎ বিল বাবদ",
    category: "utilities",
    expenseDaysAgo: 8,
    description: "ফ্যাক্টরি ফ্লোরের মাসিক বিদ্যুৎ বিল",
    status: "rejected",
    reviewerNote: "হিসাব বিভাগ কেন্দ্রীয়ভাবে পরিশোধ করে — ব্যক্তিগত দাবি নয়",
    reviewedDaysAgo: 5,
    createdDaysAgo: 6,
    items: [{ label: "বিদ্যুৎ বিল", amount: 8400, note: "DESCO বিল কপি সংযুক্ত" }],
  },
  {
    employeeCode: "PF-0014",
    title: "মাসিক টিম লাঞ্চ",
    category: "food",
    expenseDaysAgo: 15,
    description: "উৎপাদন টার্গেট পূরণের উদযাপনে টিম লাঞ্চ",
    status: "paid",
    reviewerNote: "bKash-এ পরিশোধ — TXN 8H2K9LMQ",
    reviewedDaysAgo: 10,
    createdDaysAgo: 13,
    items: [
      { label: "খাবার (২০ জন)", amount: 4200, note: "সুলতান'স ডাইন, নারায়ণগঞ্জ" },
      { label: "পানি ও স্ন্যাকস", amount: 800 },
    ],
  },
]

async function main() {
  console.log("🌱 Seeding expense claims (org: akash)...")

  const org = await db.organization.findUnique({ where: { subdomain: "akash" } })
  if (!org) {
    console.error("  ✗ Demo org 'akash' not found — run `bun prisma/seed.ts` first.")
    process.exit(1)
  }

  const existing = await db.expenseClaim.count({ where: { organizationId: org.id } })
  if (existing > 0) {
    console.log(`  ↷ Skipped — ${existing} expense claims already exist for this org.`)
    return
  }

  const employees = await db.employee.findMany({
    where: { organizationId: org.id },
    select: { id: true, employeeCode: true },
  })
  const byCode = new Map(employees.map((e) => [e.employeeCode, e.id]))

  for (const c of CLAIMS) {
    const employeeId = byCode.get(c.employeeCode)
    if (!employeeId) {
      console.warn(`  ! Employee ${c.employeeCode} not found — skipping "${c.title}"`)
      continue
    }
    const totalAmount = c.items.reduce((sum, item) => sum + item.amount, 0)
    await db.expenseClaim.create({
      data: {
        organizationId: org.id,
        employeeId,
        title: c.title,
        category: c.category,
        expenseDate: isoDaysAgo(c.expenseDaysAgo),
        totalAmount,
        description: c.description,
        status: c.status,
        reviewerNote: c.reviewerNote,
        reviewedAt: c.reviewedDaysAgo !== null ? daysAgo(c.reviewedDaysAgo) : null,
        createdAt: daysAgo(c.createdDaysAgo),
        items: {
          create: c.items.map((item) => ({
            label: item.label,
            amount: item.amount,
            note: item.note ?? null,
          })),
        },
      },
    })
    console.log(`  ✓ ${c.title} — ৳${totalAmount} (${c.status})`)
  }

  console.log("🌱 Expense seed complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
