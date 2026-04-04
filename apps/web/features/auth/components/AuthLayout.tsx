"use client"
import React from "react";
import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center pt-14 px-6 pb-12 w-full max-w-[560px] mx-auto min-h-screen">
      {children}
    </main>
  );
}
