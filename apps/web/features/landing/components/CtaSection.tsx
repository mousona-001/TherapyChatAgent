"use client"
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";

export function CtaSection() {
  return (
    <section className="text-center pt-[8rem] pb-[8rem] px-6 md:px-12 bg-surface-container-lowest relative overflow-hidden">
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-primary-container to-transparent"
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="max-w-[700px] mx-auto flex flex-col items-center"
      >
        <h2 className="font-serif text-[clamp(2.2rem,4vw,3rem)] leading-[1.1] text-on-surface mb-6">
          Continuous care is waiting.
        </h2>
        <p className="text-[1.1rem] leading-[1.7] text-on-surface-variant mb-10">
          Join Sama today and experience therapy that doesn't pause when your session ends.
        </p>

        <Link
          href="/signup"
          className="flex items-center gap-2 font-sans text-[1.1rem] font-bold text-white bg-gradient-to-br from-primary to-[#3c3dca] border-none rounded-xl py-4 px-10 shadow-[0_8px_24px_-6px_rgba(73,75,214,0.4)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_-6px_rgba(73,75,214,0.5)] no-underline"
        >
          Begin your assessment <ArrowRight weight="bold" />
        </Link>
      </motion.div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-on-surface text-white/60 pt-[4rem] pb-[2rem] px-6 md:px-12">
      <div className="max-w-[1140px] mx-auto flex flex-col md:flex-row justify-between items-start gap-10">
        <div className="max-w-[300px]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-[30px] h-[30px] bg-primary rounded-md flex items-center justify-center">
              <i className="ph ph-brain text-white text-[1rem]"></i>
            </div>
            <span className="text-[1.1rem] font-extrabold text-white tracking-[-0.02em]">
              Sama
            </span>
          </div>
          <p className="text-[0.85rem] leading-[1.6]">
            The first continuous care platform merging clinical expertise with always-on AI companions.
          </p>
        </div>

        <div className="flex gap-16">
          <div className="flex flex-col gap-3">
            <h5 className="text-[0.85rem] font-bold text-white mb-2">Platform</h5>
            <a href="#" className="text-[0.8rem] text-white/60 hover:text-white transition-colors no-underline">For Patients</a>
            <a href="#" className="text-[0.8rem] text-white/60 hover:text-white transition-colors no-underline">For Therapists</a>
            <a href="#" className="text-[0.8rem] text-white/60 hover:text-white transition-colors no-underline">Pricing</a>
          </div>
          <div className="flex flex-col gap-3">
            <h5 className="text-[0.85rem] font-bold text-white mb-2">Company</h5>
            <a href="#" className="text-[0.8rem] text-white/60 hover:text-white transition-colors no-underline">About Us</a>
            <a href="#" className="text-[0.8rem] text-white/60 hover:text-white transition-colors no-underline">Careers</a>
            <a href="#" className="text-[0.8rem] text-white/60 hover:text-white transition-colors no-underline">Clinical Advisory Board</a>
          </div>
          <div className="flex flex-col gap-3">
            <h5 className="text-[0.85rem] font-bold text-white mb-2">Legal</h5>
            <a href="#" className="text-[0.8rem] text-white/60 hover:text-white transition-colors no-underline">Privacy Policy</a>
            <a href="#" className="text-[0.8rem] text-white/60 hover:text-white transition-colors no-underline">Terms of Service</a>
            <a href="#" className="text-[0.8rem] text-white/60 hover:text-white transition-colors no-underline">HIPAA Compliance</a>
          </div>
        </div>
      </div>

      <div className="max-w-[1140px] mx-auto mt-16 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[0.75rem]">
        <p>© 2026 Sama Healthcare Inc. All rights reserved.</p>
        <p>If you are in a life-threatening crisis, please dial 911 or visit your nearest emergency room.</p>
      </div>
    </footer>
  );
}
