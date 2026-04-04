"use client"
import React from "react";
import { motion } from "framer-motion";
import {
  Robot,
  User,
  Lightning,
  ShieldCheck,
  Brain,
  ArrowRight
} from "@phosphor-icons/react";
import Link from "next/link";

export function HybridSection() {
  return (
    <section className="bg-on-surface text-white relative overflow-hidden py-[8rem] px-6 md:px-12" id="about-ai">
      {/* Background Glow */}
      <div 
        className="absolute top-[-40%] right-[-20%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(73, 75, 214, 0.25) 0%, transparent 70%)" }}
      />
      
      <div className="max-w-[1140px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="block text-[0.7rem] font-bold tracking-[0.12em] uppercase text-indigo-300 mb-4">
            The hybrid model
          </span>
          <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.2] text-white mb-4">
            Why choose between AI and human care?
          </h2>
          <p className="text-[1rem] leading-[1.7] text-white/60 mb-8 max-w-[500px]">
            Therapy apps leave you waiting a week. AI bots lack clinical depth and emergency protocols. 
            Sama merges the two to give you the most responsive and capable care model ever created.
          </p>

          <div className="flex flex-wrap gap-2 mb-10">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-md text-[0.78rem] font-semibold text-white/80 border border-white/10">
              <Lightning weight="fill" className="text-indigo-300 text-[0.85rem]" /> 0.8s avg response
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-md text-[0.78rem] font-semibold text-white/80 border border-white/10">
              <ShieldCheck weight="fill" className="text-indigo-300 text-[0.85rem]" /> Clinical oversight
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-md text-[0.78rem] font-semibold text-white/80 border border-white/10">
              <Brain weight="fill" className="text-indigo-300 text-[0.85rem]" /> Memory retention
            </div>
          </div>

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-on-surface font-sans text-[0.95rem] font-bold py-[0.85rem] px-7 rounded-lg transition-transform hover:-translate-y-[2px] cursor-pointer no-underline"
          >
            Start your journey <ArrowRight weight="bold" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col gap-4"
        >
          {/* AI vs Human Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 items-start transition-colors hover:bg-white/10">
            <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center bg-indigo-500/20 text-indigo-300">
              <Robot weight="fill" className="text-[1.1rem]" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-[0.88rem] font-bold text-white">Always-on Support</h4>
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-sm bg-indigo-500/20 text-indigo-300">AI Component</span>
              </div>
              <p className="text-[0.78rem] leading-[1.55] text-white/55">
                Handles 2am anxiety attacks, daily grounding exercises, and tracks long-term mood patterns instantly.
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 items-start transition-colors hover:bg-white/10">
            <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center bg-green-500/20 text-green-400">
              <User weight="fill" className="text-[1.1rem]" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-[0.88rem] font-bold text-white">Clinical Depth</h4>
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-sm bg-green-500/20 text-green-400">Human Expert</span>
              </div>
              <p className="text-[0.78rem] leading-[1.55] text-white/55">
                Provides diagnoses, structured treatment plans (EMDR, CBT), and works through complex core trauma.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
