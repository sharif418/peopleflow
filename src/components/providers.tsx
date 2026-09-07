"use client"

import { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { useSessionStore } from "@/store/session"

function SessionBootstrap() {
  const refresh = useSessionStore((s) => s.refresh)
  const hydrateLang = useSessionStore((s) => s.hydrateLang)

  useEffect(() => {
    hydrateLang()
    void refresh()
  }, [refresh, hydrateLang])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <SessionBootstrap />
        {children}
        <Toaster richColors position="top-center" closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
