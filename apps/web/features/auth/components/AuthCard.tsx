"use client"
import React from "react";
import Image from "next/image";
import { Card } from "@repo/ui";

interface AuthCardProps {
  label: string;
  headline: React.ReactNode;
  children: React.ReactNode;
}

export function AuthCard({ label, headline, children }: AuthCardProps) {
  return (
    <Card className="bg-surface-container-lowest rounded-md p-6 w-full shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] flex flex-col gap-5 border-none mb-6">
      
      <div className="flex flex-col items-center gap-2">
        <Image src="/brand-logo.svg" alt="Sama Logo" width={56} height={56} className="rounded-sm" />
      </div>

      <div className="w-full text-center">
        <p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-on-surface-variant mb-2">
          {label}
        </p>
        <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-extrabold tracking-[-0.02em] text-on-surface leading-tight mb-4 pb-4 border-b border-surface-container">
          {headline}
        </h1>
      </div>

      {children}

    </Card>
  );
}
