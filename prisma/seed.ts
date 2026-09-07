// PeopleFlow seed — run: bun prisma/seed.ts
import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../src/lib/crypto"

const db = new PrismaClient()

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function isoDate(n: number): string {
  return daysAgo(n).toISOString().slice(0, 10)
}

function monthKey(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ["hr_core", "attendance", "leave"],
  growth: ["hr_core", "attendance", "leave", "payroll", "recruitment", "expense", "performance"],
  enterprise: [
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
}

const PLAN_PRICE: Record<string, number> = { starter: 999, growth: 2499, enterprise: 7999 }

async function createOrg(opts: {
  name: string
  subdomain: string
  planKey: string
  status: string
  createdDaysAgo: number
  setupCompleted: boolean
  invoices?: number
  withHRData?: boolean
}): Promise<string> {
  const org = await db.organization.create({
    data: {
      name: opts.name,
      subdomain: opts.subdomain,
      siteName: `${opts.subdomain}.peopleflow.com`,
      status: opts.status,
      planKey: opts.planKey,
      setupCompleted: opts.setupCompleted,
      provisionStartedAt: daysAgo(opts.createdDaysAgo),
      createdAt: daysAgo(opts.createdDaysAgo),
    },
  })

  for (const key of PLAN_FEATURES[opts.planKey]) {
    await db.featureFlag.create({
      data: { organizationId: org.id, featureKey: key, enabled: true },
    })
  }

  if (opts.invoices) {
    for (let m = opts.invoices - 1; m >= 0; m--) {
      await db.invoice.create({
        data: {
          organizationId: org.id,
          amount: PLAN_PRICE[opts.planKey],
          status: m === 0 ? "pending" : "paid",
          period: monthKey(m),
          createdAt: daysAgo(m * 30 + 2),
        },
      })
    }
  }
  return org.id
}

async function main() {
  console.log("🌱 Seeding PeopleFlow...")

  // wipe
  await db.auditLog.deleteMany()
  await db.invoice.deleteMany()
  await db.attendanceDay.deleteMany()
  await db.employee.deleteMany()
  await db.shift.deleteMany()
  await db.branch.deleteMany()
  await db.designation.deleteMany()
  await db.department.deleteMany()
  await db.featureFlag.deleteMany()
  await db.user.deleteMany()
  await db.organization.deleteMany()

  // ── Super Admin ──
  await db.user.create({
    data: {
      email: "super@peopleflow.com",
      name: "Sharif Uddin",
      role: "SUPER_ADMIN",
      passwordHash: hashPassword("super123"),
    },
  })
  console.log("  ✓ super@peopleflow.com / super123")

  // ── Org 1: আকাশ গার্মেন্টস (full demo org) ──
  const akashId = await createOrg({
    name: "আকাশ গার্মেন্টস লিমিটেড",
    subdomain: "akash",
    planKey: "growth",
    status: "active",
    createdDaysAgo: 95,
    setupCompleted: true,
    invoices: 6,
    withHRData: true,
  })

  await db.user.create({
    data: {
      email: "admin@akash.com",
      name: "নুসরাত জাহান",
      role: "ORG_ADMIN",
      passwordHash: hashPassword("admin123"),
      organizationId: akashId,
    },
  })
  console.log("  ✓ admin@akash.com / admin123")

  const departments = await Promise.all(
    ["উৎপাদন", "মান নিয়ন্ত্রণ", "হিসাব", "মানবসম্পদ ও অ্যাডমিন", "স্টোর"].map((name) =>
      db.department.create({ data: { organizationId: akashId, name } }),
    ),
  )

  const designations = await Promise.all(
    ["জেনারেল ম্যানেজার", "ম্যানেজার", "সুপারভাইজার", "লাইন চিফ", "অপারেটর", "হিসাবরক্ষক"].map((name) =>
      db.designation.create({ data: { organizationId: akashId, name } }),
    ),
  )

  const branches = await Promise.all(
    [
      { name: "হেড অফিস (গুলশান)", address: "গুলশান-১, ঢাকা" },
      { name: "ফ্যাক্টরি-১ (নারায়ণগঞ্জ)", address: "ফতুল্লা, নারায়ণগঞ্জ" },
    ].map((b) => db.branch.create({ data: { organizationId: akashId, ...b } })),
  )

  const shifts = await Promise.all(
    [
      { name: "জেনারেল", startTime: "09:00", endTime: "18:00" },
      { name: "মর্নিং", startTime: "06:00", endTime: "14:00" },
      { name: "ইভনিং", startTime: "14:00", endTime: "22:00" },
    ].map((s) => db.shift.create({ data: { organizationId: akashId, ...s } })),
  )

  const employeesData: Array<{
    fn: string
    ln: string
    gender: string
    dept: number
    desig: number
    branch: number
    shift: number
    salary: number
    type?: string
    status?: string
    doj: number
  }> = [
    { fn: "মোঃ রফিকুল", ln: "ইসলাম", gender: "male", dept: 3, desig: 0, branch: 0, shift: 0, salary: 95000, doj: 640 },
    { fn: "নুসরাত", ln: "জাহান", gender: "female", dept: 3, desig: 1, branch: 0, shift: 0, salary: 52000, doj: 490 },
    { fn: "আব্দুল", ln: "করিম", gender: "male", dept: 2, desig: 5, branch: 0, shift: 0, salary: 38000, doj: 420 },
    { fn: "সুমাইয়া", ln: "আক্তার", gender: "female", dept: 0, desig: 2, branch: 1, shift: 1, salary: 24500, doj: 350 },
    { fn: "জাহিদ", ln: "হোসেন", gender: "male", dept: 0, desig: 3, branch: 1, shift: 1, salary: 21000, doj: 310 },
    { fn: "তানিয়া", ln: "রহমান", gender: "female", dept: 1, desig: 2, branch: 1, shift: 0, salary: 26500, doj: 280 },
    { fn: "মোঃ সেলিম", ln: "মিয়া", gender: "male", dept: 0, desig: 4, branch: 1, shift: 1, salary: 16000, doj: 240 },
    { fn: "ফারহানা", ln: "ইয়াসমিন", gender: "female", dept: 0, desig: 4, branch: 1, shift: 1, salary: 15500, doj: 220 },
    { fn: "কামরুল", ln: "হাসান", gender: "male", dept: 0, desig: 4, branch: 1, shift: 2, salary: 16200, doj: 190 },
    { fn: "রিনা", ln: "পারভীন", gender: "female", dept: 1, desig: 4, branch: 1, shift: 1, salary: 15800, doj: 170 },
    { fn: "শাহাদাত", ln: "হোসেন", gender: "male", dept: 4, desig: 2, branch: 1, shift: 0, salary: 22500, doj: 150 },
    { fn: "মিতু", ln: "চৌধুরী", gender: "female", dept: 4, desig: 4, branch: 1, shift: 0, salary: 14500, doj: 120 },
    { fn: "অপু", ln: "কুমার দাস", gender: "male", dept: 2, desig: 5, branch: 0, shift: 0, salary: 32000, doj: 100 },
    { fn: "শারমিন", ln: "সুলতানা", gender: "female", dept: 3, desig: 2, branch: 0, shift: 0, salary: 28500, doj: 75 },
    { fn: "নাজমুল", ln: "হক", gender: "male", dept: 0, desig: 3, branch: 1, shift: 2, salary: 20800, doj: 45 },
    { fn: "জেসমিন", ln: "আক্তার", gender: "female", dept: 0, desig: 4, branch: 1, shift: 1, salary: 15200, doj: 30, status: "probation" },
    { fn: "ইমরান", ln: "খান", gender: "male", dept: 1, desig: 4, branch: 1, shift: 1, salary: 16000, doj: 21, type: "contract" },
    { fn: "সাদিয়া", ln: "ইসলাম", gender: "female", dept: 3, desig: 4, branch: 0, shift: 0, salary: 15000, doj: 14, type: "intern" },
  ]

  const employees = await Promise.all(
    employeesData.map((e, i) =>
      db.employee.create({
        data: {
          organizationId: akashId,
          employeeCode: `PF-${String(i + 1).padStart(4, "0")}`,
          firstName: e.fn,
          lastName: e.ln,
          email: null,
          phone: `+8801${7 + (i % 3)}${String(10000000 + i * 7331).slice(0, 8)}`,
          gender: e.gender,
          dateOfJoining: isoDate(e.doj),
          employmentType: e.type ?? "full_time",
          status: e.status ?? "active",
          monthlySalary: e.salary,
          departmentId: departments[e.dept].id,
          designationId: designations[e.desig].id,
          branchId: branches[e.branch].id,
          shiftId: shifts[e.shift].id,
          createdAt: daysAgo(Math.min(e.doj, 30)),
        },
      }),
    ),
  )
  console.log(`  ✓ ${employees.length} employees (আকাশ গার্মেন্টস)`)

  // attendance last 14 days
  const active = employees.filter((e) => e.status === "active" || e.status === "probation").length
  for (let d = 13; d >= 0; d--) {
    const date = isoDate(d)
    const absent = d % 7 === 3 ? 3 : d % 5 === 0 ? 2 : 1
    const late = d % 4 === 0 ? 3 : 1
    const onLeave = d % 6 === 2 ? 2 : 1
    await db.attendanceDay.create({
      data: {
        organizationId: akashId,
        date,
        present: Math.max(active - absent - late - onLeave, 0),
        absent,
        late,
        onLeave,
      },
    })
  }

  // ── Org 2: ঢাকা টেক সলিউশনস (starter) ──
  const dhakaTechId = await createOrg({
    name: "ঢাকা টেক সলিউশনস লিমিটেড",
    subdomain: "dhakatech",
    planKey: "starter",
    status: "active",
    createdDaysAgo: 40,
    setupCompleted: true,
    invoices: 2,
  })
  {
    const depts = await Promise.all(
      ["ইঞ্জিনিয়ারিং", "সেলস", "সাপোর্ট"].map((name) =>
        db.department.create({ data: { organizationId: dhakaTechId, name } }),
      ),
    )
    const desigs = await Promise.all(
      ["সিনিয়র ডেভেলপার", "ডেভেলপার", "অ্যাকাউন্ট ম্যানেজার"].map((name) =>
        db.designation.create({ data: { organizationId: dhakaTechId, name } }),
      ),
    )
    const names = [
      ["আরিফ", "হোসেন", 0, 0, 65000],
      ["প্রিয়া", "দাশ", 0, 1, 42000],
      ["সাকিব", "আহমেদ", 1, 2, 38000],
      ["মৌসুমী", "আক্তার", 2, 1, 26000],
      ["রাহাত", "চৌধুরী", 0, 1, 40000],
      ["দিপা", "সরকার", 1, 2, 30000],
    ]
    await Promise.all(
      names.map((n, i) =>
        db.employee.create({
          data: {
            organizationId: dhakaTechId,
            employeeCode: `DT-${String(i + 1).padStart(3, "0")}`,
            firstName: String(n[0]),
            lastName: String(n[1]),
            gender: i % 2 === 0 ? "male" : "female",
            dateOfJoining: isoDate(200 - i * 25),
            employmentType: "full_time",
            status: "active",
            monthlySalary: Number(n[4]),
            departmentId: depts[Number(n[2])].id,
            designationId: desigs[Number(n[3])].id,
          },
        }),
      ),
    )
  }

  // ── Org 3: চট্টগ্রাম লজিস্টিকস (enterprise) ──
  const ctgId = await createOrg({
    name: "চট্টগ্রাম লজিস্টিকস লিমিটেড",
    subdomain: "ctglogistics",
    planKey: "enterprise",
    status: "active",
    createdDaysAgo: 70,
    setupCompleted: true,
    invoices: 4,
  })
  {
    const depts = await Promise.all(
      ["অপারেশনস", "ফাইন্যান্স", "আইটি"].map((name) =>
        db.department.create({ data: { organizationId: ctgId, name } }),
      ),
    )
    const desigs = await Promise.all(
      ["প্রেসিডেন্ট", "ভাইস প্রেসিডেন্ট", "ম্যানেজার", "এক্সিকিউটিভ"].map((name) =>
        db.designation.create({ data: { organizationId: ctgId, name } }),
      ),
    )
    const names = [
      ["মোঃ বেলাল", "হোসেন", 0, 0, 180000],
      ["শফিকুল", "ইসলাম", 1, 1, 120000],
      ["নাসরিন", "হক", 2, 2, 85000],
      ["তৌহিদুল", "আলম", 0, 2, 72000],
      ["রোকসানা", "বেগম", 1, 3, 45000],
      ["মেহেদী", "হাসান", 2, 3, 40000],
      ["আফরোজা", "মনি", 0, 3, 36000],
      ["সাজ্জাদ", "হোসেন", 1, 3, 35000],
      ["রুবিনা", "খাতুন", 0, 3, 34000],
    ]
    await Promise.all(
      names.map((n, i) =>
        db.employee.create({
          data: {
            organizationId: ctgId,
            employeeCode: `CL-${String(i + 1).padStart(3, "0")}`,
            firstName: String(n[0]),
            lastName: String(n[1]),
            gender: i % 2 === 0 ? "male" : "female",
            dateOfJoining: isoDate(500 - i * 40),
            employmentType: "full_time",
            status: "active",
            monthlySalary: Number(n[4]),
            departmentId: depts[Number(n[2])].id,
            designationId: desigs[Number(n[3])].id,
          },
        }),
      ),
    )
  }

  // ── Org 4: সিলেট টি এস্টেট (suspended, starter) ──
  const sylhetId = await createOrg({
    name: "সিলেট টি এস্টেট লিমিটেড",
    subdomain: "sylchtet",
    planKey: "starter",
    status: "suspended",
    createdDaysAgo: 130,
    setupCompleted: true,
    invoices: 0,
  })
  {
    const dept = await db.department.create({
      data: { organizationId: sylhetId, name: "প্লান্টেশন" },
    })
    const desig = await db.designation.create({
      data: { organizationId: sylhetId, name: "ফিল্ড অফিসার" },
    })
    await Promise.all(
      [
        ["হাবিবুর", "রহমান", 30000],
        ["চন্দন", "কুমার", 28000],
        ["আয়েশা", "সিদ্দিকা", 32000],
        ["মোঃ ফয়সাল", "আহমেদ", 29000],
      ].map((n, i) =>
        db.employee.create({
          data: {
            organizationId: sylhetId,
            employeeCode: `ST-${String(i + 1).padStart(3, "0")}`,
            firstName: String(n[0]),
            lastName: String(n[1]),
            gender: i % 2 === 0 ? "male" : "female",
            dateOfJoining: isoDate(400 - i * 30),
            employmentType: "full_time",
            status: "inactive",
            monthlySalary: Number(n[2]),
            departmentId: dept.id,
            designationId: desig.id,
          },
        }),
      ),
    )
  }

  // ── Audit logs ──
  const auditEntries = [
    { orgId: akashId as string | null, actor: "super@peopleflow.com", action: "org.created", details: "আকাশ গার্মেন্টস লিমিটেড", days: 95 },
    { orgId: akashId as string | null, actor: "admin@akash.com", action: "auth.login", days: 1 },
    { orgId: akashId as string | null, actor: "admin@akash.com", action: "employee.created", details: "PF-0018 সাদিয়া ইসলাম", days: 14 },
    { orgId: ctgId as string | null, actor: "super@peopleflow.com", action: "org.created", details: "চট্টগ্রাম লজিস্টিকস লিমিটেড", days: 70 },
    { orgId: ctgId as string | null, actor: "super@peopleflow.com", action: "feature.enabled", details: "manufacturing → ON", days: 68 },
    { orgId: dhakaTechId as string | null, actor: "super@peopleflow.com", action: "org.created", details: "ঢাকা টেক সলিউশনস লিমিটেড", days: 40 },
    { orgId: sylhetId as string | null, actor: "super@peopleflow.com", action: "org.suspended", details: "payment overdue", days: 12 },
    { orgId: null as string | null, actor: "super@peopleflow.com", action: "org.impersonated", details: "আকাশ গার্মেন্টস লিমিটেড", days: 3 },
  ]
  for (const a of auditEntries) {
    await db.auditLog.create({
      data: {
        organizationId: a.orgId,
        actor: a.actor,
        action: a.action,
        details: a.details ?? null,
        createdAt: daysAgo(a.days),
      },
    })
  }

  console.log("🌱 Seed complete!")
  console.log("   Login → super@peopleflow.com / super123")
  console.log("   Login → admin@akash.com / admin123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
