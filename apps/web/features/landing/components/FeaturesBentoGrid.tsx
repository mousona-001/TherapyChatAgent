"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  UsersThree,
  Robot,
  ChartLineUp,
  Brain,
  ShieldCheck,
  TrendUp
} from "@phosphor-icons/react";

export function FeaturesBentoGrid() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section className="bg-surface pt-[7rem] pb-[7rem] px-6 md:px-12" id="features">
      <div className="max-w-[1140px] mx-auto text-center mb-[4rem]">
        <span className="block text-[0.7rem] font-bold tracking-[0.12em] uppercase text-primary mb-4">
          Everything you need
        </span>
        <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.2] text-on-surface mb-4">
          Built for clinical excellence.
        </h2>
        <p className="text-[1rem] leading-[1.7] text-on-surface-variant max-w-[520px] mx-auto">
          We combine the empathy of top-tier licensed therapists with the continuous
          presence of advanced AI models.
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {/* Card 1 */}
        <motion.div variants={item} className="group relative bg-surface-container-lowest rounded-2xl p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant mb-5 transition-colors duration-300 group-hover:bg-primary-container group-hover:text-primary">
            <UsersThree weight="fill" className="text-[1.25rem]" />
          </div>
          <h3 className="text-[0.95rem] font-bold text-on-surface mb-2 tracking-[-0.01em]">Clinical-grade matching</h3>
          <p className="text-[0.8rem] leading-[1.65] text-on-surface-variant">
            Connect with certified therapists specializing in CBT, DBT, EMDR, and more, tailored perfectly to your needs.
          </p>
        </motion.div>

        {/* Card 2 */}
        <motion.div variants={item} className="group relative bg-surface-container-lowest rounded-2xl p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant mb-5 transition-colors duration-300 group-hover:bg-primary-container group-hover:text-primary">
            <Robot weight="fill" className="text-[1.25rem]" />
          </div>
          <h3 className="text-[0.95rem] font-bold text-on-surface mb-2 tracking-[-0.01em]">Always-on AI triage</h3>
          <p className="text-[0.8rem] leading-[1.65] text-on-surface-variant">
            Sanctuary Bot monitors your check-ins and detects crises, instantly escalating to your human care team if needed.
          </p>
        </motion.div>

        {/* Card 3 (Large Dark Bento) */}
        <motion.div variants={item} className="group relative bg-on-surface text-white rounded-2xl p-7 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:col-span-2 lg:col-span-2 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 items-center border border-outline-variant/20">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          <div>
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white/80 mb-5 transition-colors duration-300 group-hover:bg-primary-container group-hover:text-primary">
              <ChartLineUp weight="fill" className="text-[1.25rem]" />
            </div>
            <h3 className="text-[1.2rem] font-bold text-white mb-2 tracking-[-0.01em]">Deep session insights</h3>
            <p className="text-[0.85rem] leading-[1.65] text-white/65">
              Your AI companion summarizes your weekly progress and provides your therapist with clinical briefings so they never walk into a session blind.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[0.72rem] font-semibold text-white/50 mb-1">Anxiety levels</div>
                <div className="text-[1.5rem] font-extrabold text-white tracking-[-0.03em] leading-none">Low</div>
              </div>
              <div className="text-[0.7rem] font-bold text-[#4ade80] bg-[#4ade80]/15 px-2 py-1 rounded-md flex items-center gap-1">
                <TrendUp weight="bold" /> Improved
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[0.72rem] font-semibold text-white/50 mb-1">Session Attendance</div>
                <div className="text-[1.5rem] font-extrabold text-white tracking-[-0.03em] leading-none">100%</div>
              </div>
              <div className="text-[0.7rem] font-bold text-primary bg-primary/20 px-2 py-1 rounded-md">
                Perfect
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 4 */}
        <motion.div variants={item} className="group relative bg-surface-container-lowest rounded-2xl p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant mb-5 transition-colors duration-300 group-hover:bg-primary-container group-hover:text-primary">
            <Brain weight="fill" className="text-[1.25rem]" />
          </div>
          <h3 className="text-[0.95rem] font-bold text-on-surface mb-2 tracking-[-0.01em]">Evidence-based tools</h3>
          <p className="text-[0.8rem] leading-[1.65] text-on-surface-variant">
            Access interactive journaling, CBT worksheets, and guided meditations curated by your actual therapist.
          </p>
        </motion.div>

        {/* Card 5 */}
        <motion.div variants={item} className="group relative bg-surface-container-lowest rounded-2xl p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant mb-5 transition-colors duration-300 group-hover:bg-primary-container group-hover:text-primary">
            <ShieldCheck weight="fill" className="text-[1.25rem]" />
          </div>
          <h3 className="text-[0.95rem] font-bold text-on-surface mb-2 tracking-[-0.01em]">Secure & HIPAA Compliant</h3>
          <p className="text-[0.8rem] leading-[1.65] text-on-surface-variant">
            End-to-end encryption ensures your conversations, both with AI and humans, remain strictly private.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
