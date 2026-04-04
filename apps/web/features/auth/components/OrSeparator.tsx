"use client"
import React from "react";

export function OrSeparator() {
  return (
    <div className="flex items-center gap-[0.85rem] w-full my-2">
      <div className="flex-1 h-[1px] bg-surface-container" />
      <span className="text-[0.65rem] font-bold tracking-[0.1em] uppercase text-on-surface-variant opacity-65">
        or
      </span>
      <div className="flex-1 h-[1px] bg-surface-container" />
    </div>
  );
}
