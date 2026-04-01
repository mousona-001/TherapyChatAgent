"use client"
import React from "react";
import { motion } from "framer-motion";
import {
  Sparkle,
  ArrowRight,
  PlayCircle,
  ShieldCheck,
  Heartbeat,
  VideoCamera,
  Robot,
  ChartLineUp,
} from "@phosphor-icons/react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 items-center pt-[9rem] pb-[5rem] px-6 md:px-12 gap-16 overflow-hidden">
      {/* Background gradients and grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 70% 50%, rgba(73, 75, 214, 0.05) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage: `
            linear-gradient(rgba(73, 75, 214, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(73, 75, 214, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 100% 80% at 50% 50%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 100% 80% at 50% 50%, black 30%, transparent 80%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-start max-w-[600px] lg:max-w-none mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 bg-primary-container text-primary text-[0.7rem] font-bold tracking-[0.1em] uppercase py-[0.35rem] px-[0.85rem] rounded-md mb-6"
        >
          <Sparkle weight="fill" className="text-[0.85rem]" />
          The Future of Mental Healthcare
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="font-serif text-[clamp(2.75rem,5vw,4rem)] leading-[1.1] text-on-surface mb-5"
        >
          Therapy that never<br />stops <em className="not-italic italic text-primary">showing up.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="text-[1.05rem] leading-[1.75] text-on-surface-variant max-w-[480px] mb-9"
        >
          Sama pairs you with a licensed therapist and an AI companion that supports you between
          sessions — so care is continuous, not just once a week.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex flex-wrap gap-4 items-center"
        >
          <Link
            href="/signup"
            className="flex items-center gap-2 font-sans text-[0.95rem] font-bold text-white bg-gradient-to-br from-primary to-[#3c3dca] border-none rounded-lg py-[0.85rem] px-8 cursor-pointer shadow-[0_8px_24px_-6px_rgba(73,75,214,0.4)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_32px_-6px_rgba(73,75,214,0.5)] no-underline"
          >
            Find Your Therapist <ArrowRight weight="bold" className="text-[1rem]" />
          </Link>
          <button className="flex items-center gap-2 font-sans text-[0.95rem] font-semibold text-on-surface bg-transparent border-[1.5px] border-surface-container rounded-lg py-[0.85rem] px-6 cursor-pointer transition-colors duration-200 hover:border-primary hover:bg-primary-container hover:text-primary">
            <PlayCircle weight="fill" className="text-[1.2rem]" /> See How It Works
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="flex items-center gap-2 mt-8 text-[0.75rem] text-on-surface-variant"
        >
          <ShieldCheck weight="fill" className="text-primary text-[1rem]" />
          <span>
            HIPAA compliant &nbsp;·&nbsp; <strong className="text-on-surface font-bold">4,200+</strong> verified therapists &nbsp;·&nbsp; 24/7 AI support
          </span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative p-4 hidden lg:block"
      >
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-xl relative z-10 overflow-hidden">
          <div className="w-full h-[280px] rounded-xl bg-gradient-to-br from-[#e7eeff] via-[#dfe0ff] to-[#f0f3ff] flex flex-col items-center justify-center gap-4 text-on-surface-variant relative overflow-hidden">
            <div
              className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
              style={{
                background: "radial-gradient(circle at 60% 40%, rgba(73, 75, 214, 0.08) 0%, transparent 50%)",
              }}
            />
            <Heartbeat weight="fill" className="text-[3rem] opacity-30 relative z-10" />
            <span className="text-[0.85rem] font-semibold relative z-10">Your Digital Sanctuary</span>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div>
              <div className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-on-surface-variant mb-1">
                Next Session
              </div>
              <div className="text-[0.95rem] font-bold text-on-surface">
                Dr. Sarah Chen · Today 3PM
              </div>
            </div>
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <VideoCamera weight="fill" className="text-white text-[1rem]" />
            </div>
          </div>
        </div>

        {/* Floating AI Card */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-5 left-5 bg-surface-container-lowest rounded-xl py-[0.85rem] px-4 shadow-lg flex items-center gap-3 z-20"
        >
          <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center bg-primary-container text-primary">
            <Robot weight="fill" className="text-[1rem]" />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-on-surface-variant">
              AI Support
            </div>
            <div className="text-[0.88rem] font-bold text-on-surface">Available 24/7</div>
          </div>
        </motion.div>

        {/* Floating Trend Card */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-5 right-5 bg-surface-container-lowest rounded-xl py-[0.85rem] px-4 shadow-lg flex items-center gap-3 z-20"
        >
          <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center bg-[#dcf8e8] text-[#1a7a44]">
            <ChartLineUp weight="bold" className="text-[1rem]" />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-on-surface-variant">
              Mood Trend
            </div>
            <div className="text-[0.88rem] font-bold text-on-surface">+18% this week</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
