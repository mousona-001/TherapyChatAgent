"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Brain } from "@phosphor-icons/react";
import { motion } from "framer-motion";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-12 h-16 transition-all duration-300 ${
        scrolled
          ? "bg-surface/80 backdrop-blur-xl shadow-sm border-b border-outline-variant"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <Link href="/" className="flex items-center gap-2 no-underline">
        <div className="w-[30px] h-[30px] bg-primary rounded-md flex items-center justify-center">
          <Brain weight="bold" className="text-white text-base" />
        </div>
        <span className="text-[0.95rem] font-extrabold text-on-surface tracking-[-0.02em]">
          Sama
        </span>
      </Link>

      <div className="hidden md:flex gap-8">
        <Link href="#therapists" className="text-[0.85rem] font-semibold text-on-surface-variant hover:text-primary transition-colors">
          Therapists
        </Link>
        <Link href="#how-it-works" className="text-[0.85rem] font-semibold text-on-surface-variant hover:text-primary transition-colors">
          How it Works
        </Link>
        <Link href="#about-ai" className="text-[0.85rem] font-semibold text-on-surface-variant hover:text-primary transition-colors">
          About AI
        </Link>
        <Link href="#pricing" className="text-[0.85rem] font-semibold text-on-surface-variant hover:text-primary transition-colors">
          Pricing
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/signin"
          className="font-sans text-[0.85rem] font-semibold text-on-surface bg-transparent border-none cursor-pointer py-2 px-4 rounded-md transition-colors hover:bg-surface-container-low"
        >
          Log In
        </Link>
        <Link
          href="/signup"
          className="font-sans text-[0.85rem] font-bold text-white bg-primary border-none rounded-md py-2 px-5 cursor-pointer transition-all hover:opacity-90 hover:-translate-y-[1px]"
        >
          Get Started
        </Link>
      </div>
    </motion.nav>
  );
}
