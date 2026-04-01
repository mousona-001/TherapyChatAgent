import { DashboardLayout } from "@/features/dashboard/components/DashboardLayout"
import { ReactNode } from "react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard | Sama",
  description: "Your personalized mental healthcare dashboard.",
}

export default function RootDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}
