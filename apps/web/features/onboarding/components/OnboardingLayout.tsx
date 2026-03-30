import { ReactNode } from "react";
import { Question } from "@phosphor-icons/react";

interface OnboardingLayoutProps {
  children: ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)] text-[var(--on-surface)] font-sans">
      <nav className="flex items-center justify-between px-8 h-[56px] bg-[rgba(249,249,255,0.8)] backdrop-blur-[20px] border-b border-[var(--outline-variant)] sticky top-0 z-10">
        <span className="text-[0.9rem] font-bold text-[var(--on-surface)] tracking-[-0.01em]">
          Sama
        </span>
        <button className="w-8 h-8 rounded-[var(--r-sm)] bg-[var(--surface-container-low)] flex items-center justify-center text-[var(--on-surface-variant)] cursor-pointer border-none hover:bg-[var(--surface-container)] transition-colors">
          <Question weight="bold" />
        </button>
      </nav>

      <main className="flex-1 flex flex-col items-center pt-14 px-6 pb-28 max-w-[760px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
