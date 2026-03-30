"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import {
  MagnifyingGlass,
  VideoCamera,
  Microphone,
  PhoneSlash,
  Robot,
  Warning,
  CheckCircle,
} from "@phosphor-icons/react";

export function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Use Framer Motion to robustly measure scroll progress across the 400vh container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    // Start tracking when top of container hits top of viewport
    // Stop tracking when bottom of container hits bottom of viewport
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // latest is a value from 0 to 1 representing scroll progress through the container
    const maxSteps = 4;
    // Map 0 -> 1 progress to step indices 0, 1, 2, 3
    const stepIdx = Math.min(maxSteps - 1, Math.floor(latest * maxSteps));
    setActiveStep(stepIdx);
  });

  const steps = [
    {
      num: "01",
      title: "Get matched with your therapist",
      desc: "Our clinical matching algorithm considers your history, preferences, and goals to connect you with a licensed professional who truly fits.",
    },
    {
      num: "02",
      title: "Attend structured sessions",
      desc: "Video or in-person sessions follow evidence-based protocols — CBT, DBT, EMDR — guided by your therapist's clinical expertise.",
    },
    {
      num: "03",
      title: "AI supports you between sessions",
      desc: "Sanctuary Bot, trained on clinical best practices, checks in daily, logs your mood, and surfaces insights for your next session.",
    },
    {
      num: "04",
      title: "Emergency escalation when it matters",
      desc: "Distress signals are detected and automatically routed to human support — your therapist, emergency contact, or crisis line.",
    },
  ];

  return (
    <section className="bg-surface-container-lowest" id="how-it-works">
      {/* 400vh container creates the scrollable area */}
      <div ref={containerRef} className="h-[400vh] relative w-full">
        {/* Sticky inner container follows the viewport */}
        <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden">
          
          <div className="max-w-[1140px] mx-auto w-full px-6 md:px-12 mb-8 lg:mb-12">
            <span className="block text-center text-[0.7rem] font-bold tracking-[0.12em] uppercase text-primary mb-4">
              Your care journey
            </span>
            <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.2] text-on-surface text-center mb-3">
              Human expertise.<br />AI availability.
            </h2>
            <p className="text-[1rem] leading-[1.7] text-on-surface-variant max-w-[520px] mx-auto text-center">
              Three seamlessly connected layers ensure you're supported at every moment — from weekly sessions to 3am crises.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 max-w-[1140px] mx-auto w-full px-6 md:px-12">
            
            {/* Left Steps List */}
            <div className="flex flex-col flex-1 w-full justify-center">
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`flex items-start gap-5 py-4 lg:py-6 border-b border-outline-variant cursor-pointer transition-all duration-300 ${
                      isActive ? "opacity-100" : "opacity-30"
                    } ${idx === steps.length - 1 ? "border-b-0" : ""}`}
                  >
                    <div
                      className={`w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-[0.8rem] font-extrabold transition-all duration-300 ${
                        isActive
                          ? "bg-primary text-white shadow-md scale-110"
                          : "bg-surface-container-low text-on-surface-variant"
                      }`}
                    >
                      {step.num}
                    </div>
                    <div className={`transition-transform duration-300 ${isActive ? "translate-x-1" : ""}`}>
                      <h4 className={`text-[1rem] lg:text-[1.1rem] font-bold text-on-surface mb-2 transition-colors ${isActive ? "text-primary" : ""}`}>
                        {step.title}
                      </h4>
                      <p className="text-[0.85rem] lg:text-[0.9rem] leading-[1.6] text-on-surface-variant line-clamp-2">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Visual Panel Container */}
            <div className="hidden lg:block w-full">
              <div className="bg-surface-container-low rounded-2xl p-7 shadow-lg h-[460px] relative overflow-hidden ring-1 ring-outline-variant/30 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {/* Panel 0: Matching */}
                  {activeStep === 0 && (
                    <motion.div
                      key="panel-0"
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1.02, y: -10 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="w-full absolute inset-0 p-7 flex flex-col justify-center"
                    >
                      <div className="flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-5">
                        <MagnifyingGlass weight="bold" className="text-primary text-[0.85rem]" /> Smart Matching
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <div className="bg-surface-container-lowest rounded-xl p-3 flex items-center gap-3 shadow-[0_0_0_2px_var(--primary),var(--shadow-sm)]">
                          <div className="w-[38px] h-[38px] rounded-lg flex-shrink-0 flex items-center justify-center text-[0.75rem] font-bold bg-primary-container text-primary">SC</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[0.82rem] font-bold text-on-surface truncate">Dr. Sarah Chen, LCSW</div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              <span className="text-[0.62rem] font-bold bg-surface-container text-on-surface-variant px-[0.45rem] py-[0.1rem] rounded-sm">CBT</span>
                              <span className="text-[0.62rem] font-bold bg-surface-container text-on-surface-variant px-[0.45rem] py-[0.1rem] rounded-sm">Trauma</span>
                              <span className="text-[0.62rem] font-bold bg-surface-container text-on-surface-variant px-[0.45rem] py-[0.1rem] rounded-sm">Anxiety</span>
                            </div>
                          </div>
                          <div className="text-[0.88rem] font-extrabold text-primary flex-shrink-0">98%</div>
                        </div>

                        <div className="bg-surface-container-lowest rounded-xl p-3 flex items-center gap-3 shadow-sm opacity-80">
                          <div className="w-[38px] h-[38px] rounded-lg flex-shrink-0 flex items-center justify-center text-[0.75rem] font-bold bg-[#dcfce7] text-[#166534]">RM</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[0.82rem] font-bold text-on-surface truncate">Dr. Ravi Menon, PsyD</div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              <span className="text-[0.62rem] font-bold bg-surface-container text-on-surface-variant px-[0.45rem] py-[0.1rem] rounded-sm">DBT</span>
                              <span className="text-[0.62rem] font-bold bg-surface-container text-on-surface-variant px-[0.45rem] py-[0.1rem] rounded-sm">Addiction</span>
                            </div>
                          </div>
                          <div className="text-[0.88rem] font-extrabold text-[#166534] flex-shrink-0">91%</div>
                        </div>

                        <div className="bg-surface-container-lowest rounded-xl p-3 flex items-center gap-3 shadow-sm opacity-60">
                          <div className="w-[38px] h-[38px] rounded-lg flex-shrink-0 flex items-center justify-center text-[0.75rem] font-bold bg-[#fef3c7] text-[#92400e]">LK</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[0.82rem] font-bold text-on-surface truncate">Dr. Lisa Kim, MFT</div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              <span className="text-[0.62rem] font-bold bg-surface-container text-on-surface-variant px-[0.45rem] py-[0.1rem] rounded-sm">EMDR</span>
                              <span className="text-[0.62rem] font-bold bg-surface-container text-on-surface-variant px-[0.45rem] py-[0.1rem] rounded-sm">Grief</span>
                            </div>
                          </div>
                          <div className="text-[0.88rem] font-extrabold text-[#92400e] flex-shrink-0">87%</div>
                        </div>
                      </div>
                      <div className="mt-5 text-[0.75rem] text-on-surface-variant flex items-center gap-2">
                        <CheckCircle weight="fill" className="text-primary" /> Matched based on goals, language, and availability
                      </div>
                    </motion.div>
                  )}

                  {/* Panel 1: Live Session */}
                  {activeStep === 1 && (
                    <motion.div
                      key="panel-1"
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1.02, y: -10 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="w-full absolute inset-0 p-7 flex flex-col justify-center"
                    >
                      <div className="flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-5">
                        <VideoCamera weight="bold" className="text-primary text-[0.85rem]" /> Live Session
                      </div>
                      
                      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-container text-primary flex items-center justify-center text-[0.78rem] font-bold flex-shrink-0">
                            SC
                          </div>
                          <div>
                            <div className="text-[0.88rem] font-bold text-on-surface">Dr. Sarah Chen</div>
                            <div className="text-[0.72rem] text-[#1a7a44] font-semibold flex items-center gap-1.5 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1a7a44] animate-pulse"></span>
                              Live · 24 min
                            </div>
                          </div>
                          <div className="ml-auto flex gap-2">
                            <div className="w-8 h-8 rounded-md bg-primary-container text-primary flex items-center justify-center cursor-pointer">
                              <Microphone weight="fill" className="text-[0.9rem]" />
                            </div>
                            <div className="w-8 h-8 rounded-md bg-red-100 text-red-600 flex items-center justify-center cursor-pointer">
                              <PhoneSlash weight="fill" className="text-[0.9rem]" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-surface-container-low rounded-lg p-4 mt-4">
                          <div className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">Session notes — live</div>
                          <div className="text-[0.8rem] leading-[1.6] text-on-surface">
                            Patient reports elevated anxiety around work. Identifying cognitive distortions — <span className="text-primary font-semibold">all-or-nothing thinking</span> present. Applying ABC model...
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap mt-4">
                          <span className="text-[0.7rem] font-semibold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">CBT Framework</span>
                          <span className="text-[0.7rem] font-semibold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">Thought record</span>
                          <span className="text-[0.7rem] font-semibold text-primary bg-primary-container px-3 py-1 rounded-full">Active</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Panel 2: AI Bot */}
                  {activeStep === 2 && (
                    <motion.div
                      key="panel-2"
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1.02, y: -10 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="w-full absolute inset-0 p-7 flex justify-end flex-col h-full"
                    >
                      <div className="flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-5">
                        <Robot weight="bold" className="text-primary text-[0.85rem]" /> Sanctuary Bot
                      </div>
                      
                      <div className="flex gap-3 mb-4 items-end">
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-primary-container text-primary flex items-center justify-center">
                          <Robot weight="fill" className="text-[0.9rem]" />
                        </div>
                        <div className="bg-surface-container-lowest text-on-surface shadow-sm rounded-xl py-2 px-3 text-[0.8rem] leading-[1.55] max-w-[75%]">
                          Good morning! Your session with Dr. Chen is tomorrow at 3PM. How are you feeling today?
                        </div>
                      </div>

                      <div className="flex gap-3 mb-4 items-end justify-end">
                        <div className="bg-primary text-white shadow-sm rounded-xl py-2 px-3 text-[0.8rem] leading-[1.55] max-w-[75%]">
                          Anxious about a presentation. Can't stop thinking about it.
                        </div>
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-on-surface text-white text-[0.7rem] font-bold flex items-center justify-center">
                          JR
                        </div>
                      </div>

                      <div className="flex gap-3 mb-4 items-end">
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-primary-container text-primary flex items-center justify-center">
                          <Robot weight="fill" className="text-[0.9rem]" />
                        </div>
                        <div className="bg-surface-container-lowest text-on-surface shadow-sm rounded-xl py-2 px-3 text-[0.8rem] leading-[1.55] max-w-[75%]">
                          I hear you. Let's try a quick grounding exercise — it helped last Tuesday. Ready when you are.
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap mt-2">
                        <span className="text-[0.72rem] font-semibold text-primary bg-primary-container px-3 py-1 rounded-full cursor-pointer hover:bg-primary hover:text-white transition-colors">Try breathing exercise</span>
                        <span className="text-[0.72rem] font-semibold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full cursor-pointer hover:bg-primary-container hover:text-primary transition-colors">Log my mood</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Panel 3: Emergency */}
                  {activeStep === 3 && (
                    <motion.div
                      key="panel-3"
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1.02, y: -10 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="w-full absolute inset-0 p-7 flex flex-col justify-center"
                    >
                      <div className="flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.1em] uppercase text-red-600 mb-5">
                        <Warning weight="bold" className="text-red-600 text-[0.85rem]" /> Crisis Protocol
                      </div>
                      
                      <div className="bg-red-50 rounded-xl p-4 mb-5 border-l-4 border-red-600 shadow-sm">
                        <div className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-red-600 mb-1.5">Distress signal detected</div>
                        <div className="text-[0.82rem] text-red-900 leading-[1.55]">High-risk language pattern identified in last message. Escalating to Dr. Sarah Chen.</div>
                      </div>

                      <div className="flex flex-col relative before:content-[''] before:absolute before:left-[7px] before:top-[28px] before:bottom-6 before:w-[2px] before:bg-surface-container">
                        <div className="flex items-start gap-3 py-2 z-10">
                          <div className="w-4 h-4 rounded-full flex-shrink-0 mt-1 bg-[#1a7a44] border-2 border-[#1a7a44] outline outline-2 outline-white relative"></div>
                          <div>
                            <strong className="block text-[0.82rem] font-bold text-on-surface">AI flagged distress signal</strong>
                            <span className="text-[0.72rem] text-on-surface-variant">2 seconds ago</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 py-2 z-10">
                          <div className="w-4 h-4 rounded-full flex-shrink-0 mt-1 bg-[#1a7a44] border-2 border-[#1a7a44] outline outline-2 outline-white relative"></div>
                          <div>
                            <strong className="block text-[0.82rem] font-bold text-on-surface">Therapist notified</strong>
                            <span className="text-[0.72rem] text-on-surface-variant">Dr. Sarah Chen · 8 seconds ago</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 py-2 z-10">
                          <div className="w-4 h-4 rounded-full flex-shrink-0 mt-1 bg-primary border-2 border-primary shadow-[0_0_0_4px_rgba(73,75,214,0.2)] animate-pulse relative"></div>
                          <div>
                            <strong className="block text-[0.82rem] font-bold text-on-surface">Awaiting therapist response</strong>
                            <span className="text-[0.72rem] text-on-surface-variant">Est. 3 min</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 py-2 z-10">
                          <div className="w-4 h-4 rounded-full flex-shrink-0 mt-1 bg-surface-container border-2 border-surface-container outline outline-2 outline-white relative"></div>
                          <div>
                            <strong className="block text-[0.82rem] font-bold text-on-surface">Emergency contact fallback</strong>
                            <span className="text-[0.72rem] text-on-surface-variant">If no response in 10 min</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
