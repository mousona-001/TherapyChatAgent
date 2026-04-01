"use client"

import { ReactNode } from "react";
import { SidebarProvider } from "@repo/ui"
import { AppSidebar } from "./AppSidebar"

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-surface relative">
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
