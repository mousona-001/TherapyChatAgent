"use client";

import { ReactNode } from "react";

interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function DashboardPageHeader({
  title,
  description,
  children,
}: DashboardPageHeaderProps) {
  return (
    <div className="shrink-0 pt-6 pb-5 px-8 border-b border-outline-variant bg-[rgba(249,249,255,0.96)] backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.4rem,2.5vw,1.85rem)] font-extrabold tracking-[-0.02em] text-on-surface">
            {title}
          </h1>
          {description && (
            <p className="text-[0.84rem] text-on-surface-variant mt-1">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3 shrink-0">{children}</div>
        )}
      </div>
    </div>
  );
}
