import Link from "next/link"
import { Compass, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PeopleFlowLogo } from "@/components/shared/peopleflow-logo"

export default function NotFound() {
  return (
    <div className="grain-bg flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <PeopleFlowLogo markClassName="h-10 w-10" className="text-base" />
          <span className="mx-auto mt-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Compass className="h-5 w-5" aria-hidden />
          </span>
          <CardTitle className="mt-2 text-lg">৪০৪ — পাওয়া যায়নি</CardTitle>
          <CardDescription>এই পাতাটি খুঁজে পাওয়া যায়নি। URL ঠিক আছে কি না দেখে নিন।</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden />
              হোমে ফিরে যান
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
