"use client";

import { Sidebar } from "./Sidebar";
import { ReactNode } from "react";
import { 
  Bell, 
  MagnifyingGlass, 
  Question,
  UserCircle
} from "@phosphor-icons/react";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <div className="flex bg-[var(--surface)] min-h-screen font-sans">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-[72px] flex items-center justify-between px-8 border-b border-[var(--outline-variant)] bg-[rgba(255,255,255,0.7)] backdrop-blur-md sticky top-0 z-10">
          <div className="flex flex-col">
             {title && (
               <h1 className="text-lg font-bold text-[var(--on-surface)] tracking-tight">
                 {title}
               </h1>
             )}
             {subtitle && (
               <p className="text-[0.75rem] text-[var(--on-surface-variant)] font-medium">
                 {subtitle}
               </p>
             )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:flex items-center">
              <MagnifyingGlass className="absolute left-3 text-[var(--on-surface-variant)]" size={18} />
              <input 
                type="text" 
                placeholder="Search across Sama..."
                className="bg-[var(--surface-container-low)] border-none rounded-full pl-10 pr-4 py-2 text-sm w-[260px] focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>

            <button className="w-10 h-10 rounded-full hover:bg-[var(--surface-container-low)] flex items-center justify-center transition-colors text-[var(--on-surface-variant)]">
               <Bell size={20} />
            </button>
            
            <div className="w-10 h-10 rounded-full bg-[var(--surface-container-low)] flex items-center justify-center overflow-hidden border border-[var(--outline-variant)] cursor-pointer">
              {/* Profile Avatar placeholder */}
              <UserCircle size={32} weight="light" className="text-[var(--on-surface-variant)]" />
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-8 customize-scrollbar">
           {children}
        </main>
      </div>
    </div>
  );
}
