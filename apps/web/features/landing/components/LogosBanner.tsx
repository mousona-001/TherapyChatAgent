"use client";

import React from "react";

export function LogosBanner() {
  const logos = [
    "TechCrunch",
    "Forbes Health",
    "The Lancet",
    "JAMA Digital",
    "Mental Health Today",
    "Wired",
    "TIME Health",
  ];

  return (
    <div className="py-10 px-6 md:px-12 border-y border-outline-variant bg-surface-container-lowest flex items-center gap-12 overflow-hidden">
      <span className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-on-surface-variant opacity-60 whitespace-nowrap flex-shrink-0">
        Featured in
      </span>
      <div className="flex gap-12 overflow-hidden flex-1 relative">
        <div className="flex gap-12 animate-[marquee_24s_linear_infinite] whitespace-nowrap">
          {[...logos, ...logos, ...logos].map((logo, i) => (
            <span
              key={i}
              className="text-[0.88rem] font-extrabold text-on-surface opacity-25 tracking-[-0.02em]"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
