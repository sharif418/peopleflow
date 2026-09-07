// Recruitment seed — run: bun scripts/seed-recruitment.ts
// Seeds the demo org (subdomain "akash") with 5 job postings, 12 applications
// across all pipeline stages and 4 interviews (2 upcoming, 2 past with feedback).
// Idempotent: skips when job postings already exist for the org.
import { db } from "@/lib/db"
import type { JobApplication, JobPosting } from "@prisma/client"

const DAY_MS = 24 * 60 * 60 * 1000

function daysFromNow(n: number, hour = 10, minute = 0): Date {
  const d = new Date(Date.now() + n * DAY_MS)
  d.setHours(hour, minute, 0, 0)
  return d
}

async function main() {
  console.log("🌱 Seeding recruitment data (আকাশ গার্মেন্টস)...")

  const org = await db.organization.findUnique({ where: { subdomain: "akash" } })
  if (!org) {
    throw new Error('Demo org "akash" not found — run `bun prisma/seed.ts` first.')
  }

  const existing = await db.jobPosting.count({ where: { organizationId: org.id } })
  if (existing > 0) {
    console.log(`  ↷ skipped — ${existing} job postings already exist for this org`)
    return
  }

  const departments = await db.department.findMany({ where: { organizationId: org.id } })
  const designations = await db.designation.findMany({ where: { organizationId: org.id } })
  const deptId = (name: string) => departments.find((d) => d.name === name)?.id ?? null
  const desigId = (name: string) => designations.find((d) => d.name === name)?.id ?? null

  // ── 5 job postings (BD garment/tech context) ──
  const jobDefs = [
    {
      title: "সিনিয়র মেশিন অপারেটর — ঢাকা",
      departmentId: deptId("উৎপাদন"),
      designationId: desigId("অপারেটর"),
      employmentType: "full_time",
      vacancies: 5,
      status: "open",
      description:
        "সেলাই মেশিন চালানোয় ৩+ বছরের অভিজ্ঞতা। লাইন ব্যালেন্সিং ও কোয়ালিটি কন্ট্রোলে দক্ষ। বেতন ৳২৫,০০০–৩৫,০০০ (ওভারটাইম আলাদা)। ফ্যাক্টরি-১, নারায়ণগঞ্জ।",
      postedDaysAgo: 12,
      closesInDays: 18,
    },
    {
      title: "জুনিয়র অ্যাকাউন্টেন্ট",
      departmentId: deptId("হিসাব"),
      designationId: desigId("হিসাবরক্ষক"),
      employmentType: "full_time",
      vacancies: 2,
      status: "open",
      description:
        "কমার্স স্নাতক। ট্যালি/জার্নাল এন্ট্রি ও এক্সেলে দক্ষ হতে হবে। VAT ও AIT-এর বেসিক ধারণা থাকলে অগ্রাধিকার। বেতন ৳২৫,০০০–৪০,০০০। হেড অফিস, গুলশান।",
      postedDaysAgo: 8,
      closesInDays: 22,
    },
    {
      title: "HR অফিসার",
      departmentId: deptId("মানবসম্পদ ও অ্যাডমিন"),
      designationId: null,
      employmentType: "full_time",
      vacancies: 1,
      status: "open",
      description:
        "নিয়োগ, অন-বোর্ডিং ও কর্মী রেকর্ড ব্যবস্থাপনায় ২+ বছরের অভিজ্ঞতা। বাংলাদেশ শ্রম আইন সম্পর্কে ধারণা থাকতে হবে। বেতন ৳৩৫,০০০–৪৫,০০০।",
      postedDaysAgo: 6,
      closesInDays: 25,
    },
    {
      title: "মার্চেন্ডাইজার",
      departmentId: deptId("উৎপাদন"),
      designationId: null,
      employmentType: "contract",
      vacancies: 2,
      status: "on_hold",
      description:
        "বায়ার কমিউনিকেশন, টেকনিক্যাল প্যাক ও প্রোডাকশন ফলো-আপ। ইংরেজিতে লেখালেখিতে দক্ষ। ১ বছরের চুক্তিভিত্তিক নিয়োগ। বেতন ৳৪০,০০০–৬০,০০০।",
      postedDaysAgo: 20,
      closesInDays: 10,
    },
    {
      title: "সেলস এক্সিকিউটিভ — চট্টগ্রাম",
      departmentId: null,
      designationId: null,
      employmentType: "full_time",
      vacancies: 3,
      status: "closed",
      description:
        "চট্টগ্রাম অঞ্চলের থানা/হোলসেল ডিস্ট্রিবিউটরদের সাথে বিল কালেকশন ও নতুন আউটলেট তৈরি। B2B সেলসে ১+ বছরের অভিজ্ঞতা। বেতন ৳২৫,০০০–৩০,০০০ + কমিশন।",
      postedDaysAgo: 30,
      closesInDays: -5,
    },
  ]

  const jobs: JobPosting[] = []
  for (const j of jobDefs) {
    jobs.push(
      await db.jobPosting.create({
        data: {
          organizationId: org.id,
          title: j.title,
          departmentId: j.departmentId,
          designationId: j.designationId,
          employmentType: j.employmentType,
          vacancies: j.vacancies,
          status: j.status,
          description: j.description,
          postedAt: daysFromNow(-j.postedDaysAgo, 10, 0),
          closesAt: daysFromNow(j.closesInDays, 23, 59),
          createdAt: daysFromNow(-j.postedDaysAgo, 10, 0),
        },
      }),
    )
  }
  console.log(`  ✓ ${jobs.length} job postings`)

  // ── 12 applications across all stages ──
  const appDefs = [
    // সিনিয়র মেশিন অপারেটর — ঢাকা
    { job: 0, name: "রাহাত হোসেন", email: "rahat.hossain98@gmail.com", phone: "01712345678", salary: 30000, stage: "applied", rating: 0, cover: "নারায়ণগঞ্জের ৩ বছরের অভিজ্ঞতা, Juki ডাবল নিডল মেশিনে কাজ করেছি।", appliedDaysAgo: 2 },
    { job: 0, name: "তানিয়া আক্তার", email: "tania.akter15@gmail.com", phone: "01812345678", salary: 32000, stage: "applied", rating: 0, cover: "স্যাম্পল সেকশনে ২ বছর কাজ করছি, সেলাই মেশিনে দক্ষ।", appliedDaysAgo: 1 },
    { job: 0, name: "সাব্বির আহমেদ", email: "sabbir.ahmed74@gmail.com", phone: "01912345678", salary: 35000, stage: "screening", rating: 3, cover: "৯ বছরের অভিজ্ঞতা, লাইন চিফ হিসেবেও দায়িত্ব নিয়েছি।", appliedDaysAgo: 4, notes: "ফোনে কথা হয়েছে — ১৫ তারিখে সাক্ষাৎকার দিতে বলা হয়েছে।" },
    { job: 0, name: "মৌসুমী বেগম", email: null, phone: "01612345678", salary: 28000, stage: "interview", rating: 4, cover: null, appliedDaysAgo: 5 },
    // জুনিয়র অ্যাকাউন্টেন্ট
    { job: 1, name: "ইমরান খান", email: "imran.khan.hr@gmail.com", phone: "01722345678", salary: 30000, stage: "screening", rating: 3, cover: "কমার্স স্নাতক (২০২৩), ট্যালিতে ১ বছরের ইন্টার্নশিপ।", appliedDaysAgo: 3 },
    { job: 1, name: "নুসরাত জাহান", email: "nusrat.jahan.acc@gmail.com", phone: "01822345678", salary: 38000, stage: "offer", rating: 5, cover: "চার্টার্ড ফার্মে ২ বছর কাজ করেছি, মাসিক ভ্যাট রিটার্ন জানি।", appliedDaysAgo: 6, notes: "সেলারি ৳৩৬,০০০ + মোবাইল বিল প্রস্তাব করা হয়েছে।" },
    { job: 1, name: "আরিফুল ইসলাম", email: "ariful.islam.bd@gmail.com", phone: "01922345678", salary: 26000, stage: "applied", rating: 0, cover: null, appliedDaysAgo: 2 },
    // HR অফিসার
    { job: 2, name: "শারমিন সুলতানা", email: "sharmin.sultana.hr@gmail.com", phone: "01733345678", salary: 42000, stage: "interview", rating: 4, cover: "গার্মেন্টস HR-এ ৩ বছর — ৫০০+ কর্মীর রেকর্ড ব্যবস্থাপনা করেছি।", appliedDaysAgo: 4 },
    { job: 2, name: "জুবায়ের হাসান", email: "zubayer.hasan79@gmail.com", phone: "01833345678", salary: 40000, stage: "hired", rating: 5, cover: "রিক্রুটমেন্ট এজেন্সিতে ২ বছর, বাংলাদেশ শ্রম আইনে অভিজ্ঞ।", appliedDaysAgo: 6, notes: "১ তারিখ থেকে জয়েনিং কনফার্ম — অফার লেটার ইস্যু হয়েছে।" },
    // মার্চেন্ডাইজার
    { job: 3, name: "ফারজানা রহমান", email: "farzana.rahman.md@gmail.com", phone: "01744345678", salary: 55000, stage: "screening", rating: 4, cover: "LWM-এ ৪ বছর মার্চেন্ডাইজিং, বায়ার ইমেইল কমিউনিকেশনে দক্ষ।", appliedDaysAgo: 9, notes: "পোস্ট স্থগিত আছে — নতুন অর্ডার নিশ্চিত হলে যোগাযোগ করা হবে।" },
    { job: 3, name: "কামরুল হাসান", email: "kamrul.hasan.mer@gmail.com", phone: "01944345678", salary: 60000, stage: "rejected", rating: 2, cover: null, appliedDaysAgo: 12, notes: "ইংরেজি যোগাযোগ দুর্বল — বায়ার মিটিংয়ে সমস্যা হবে।" },
    // সেলস এক্সিকিউটিভ — চট্টগ্রাম
    { job: 4, name: "মেহেদী হাসান", email: "mehedi.hasan.sales@gmail.com", phone: "01755345678", salary: 28000, stage: "applied", rating: 0, cover: "চট্টগ্রামের বহুদ্বৈপ এলাকায় ২ বছর ডিস্ট্রিবিউশন সেলস।", appliedDaysAgo: 16 },
  ]

  const apps: JobApplication[] = []
  for (const a of appDefs) {
    apps.push(
      await db.jobApplication.create({
        data: {
          organizationId: org.id,
          jobPostingId: jobs[a.job].id,
          candidateName: a.name,
          candidateEmail: a.email,
          candidatePhone: a.phone,
          expectedSalary: a.salary,
          coverNote: a.cover,
          stage: a.stage,
          rating: a.rating,
          notes: a.notes ?? null,
          createdAt: daysFromNow(-a.appliedDaysAgo, 12, 0),
        },
      }),
    )
  }
  console.log(`  ✓ ${apps.length} applications (all stages covered)`)

  // ── 4 interviews (2 upcoming, 2 past with feedback + results) ──
  const interviewDefs = [
    { app: 3, round: 1, mode: "onsite", at: daysFromNow(3, 11, 0), interviewer: "নুসরাত জাহান (HR)", feedback: null, result: "pending" },
    { app: 7, round: 1, mode: "video", at: daysFromNow(5, 15, 30), interviewer: "মোঃ রফিকুল ইসলাম (GM)", feedback: null, result: "pending" },
    { app: 8, round: 1, mode: "onsite", at: daysFromNow(-10, 10, 0), interviewer: "নুসরাত জাহান (HR)", feedback: "যোগাযোগ দক্ষ, HR নিয়মকানুন ও শ্রম আইনে স্পষ্ট ধারণা আছে।", result: "pass" },
    { app: 5, round: 1, mode: "phone", at: daysFromNow(-7, 16, 0), interviewer: "আব্দুল করিম (হিসাব)", feedback: "ট্যালি ও এক্সেলে দক্ষ, বেতন প্রত্যাশা নিয়ে আলোচনা হয়েছে।", result: "pass" },
  ]
  for (const iv of interviewDefs) {
    await db.interview.create({
      data: {
        organizationId: org.id,
        applicationId: apps[iv.app].id,
        round: iv.round,
        mode: iv.mode,
        scheduledAt: iv.at,
        interviewer: iv.interviewer,
        feedback: iv.feedback,
        result: iv.result,
      },
    })
  }
  console.log(`  ✓ ${interviewDefs.length} interviews (2 upcoming, 2 past)`)

  console.log("🌱 Recruitment seed complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
