import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Hind_Siliguri } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: {
    default: "PeopleFlow — বাংলাদেশের অফিস ম্যানেজমেন্ট প্ল্যাটফর্ম",
    template: "%s | PeopleFlow",
  },
  description:
    "HR, Payroll, Attendance, Accounting, Inventory — বাংলাদেশের প্রতিটা অফিসের ডিজিটাল ব্যাকবোন। ERPNext পাওয়ার্ড, মোবাইল-ফার্স্ট, বাংলা + English।",
  keywords: [
    "PeopleFlow",
    "HR software Bangladesh",
    "payroll Bangladesh",
    "attendance",
    "office management",
    "ERPNext",
    "HRMS",
  ],
  applicationName: "PeopleFlow",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d9468" },
    { media: "(prefers-color-scheme: dark)", color: "#0c2b21" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${hindSiliguri.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
