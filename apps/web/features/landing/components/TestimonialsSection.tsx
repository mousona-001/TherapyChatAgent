"use client"
import React from "react";
import { motion } from "framer-motion";
import { Star } from "@phosphor-icons/react";

export function TestimonialsSection() {
  const testimonials = [
    {
      quote: "My therapist is phenomenal, but having the AI bot there at 2am when I had a panic attack completely changed my relationship with my anxiety.",
      author: "Elena R.",
      role: "Patient for 6 months",
      tag: "Anxiety",
      initials: "ER"
    },
    {
      quote: "As a clinician, Sama is a revelation. I review the AI summaries before sessions, meaning we spend our 45 minutes on deep work, not just catching up.",
      author: "Dr. James Wilson",
      role: "Clinical Psychologist",
      tag: "Provider",
      initials: "JW"
    },
    {
      quote: "I tried typical therapy apps but they felt so disconnected. The hybrid model here feels like I have a dedicated care team surrounding me constantly.",
      author: "Marcus T.",
      role: "Patient for 1 year",
      tag: "Depression",
      initials: "MT"
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section className="bg-surface-container-low pt-[7rem] pb-[7rem] px-6 md:px-12">
      <div className="max-w-[1140px] mx-auto text-center mb-[4rem]">
        <span className="block text-[0.7rem] font-bold tracking-[0.12em] uppercase text-primary mb-4">
          Real Outcomes
        </span>
        <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.2] text-on-surface mb-4">
          Don't just take our word for it.
        </h2>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        {testimonials.map((testi, i) => (
          <motion.div
            key={i}
            variants={item}
            className="bg-surface-container-lowest rounded-2xl p-7 shadow-sm flex flex-col gap-4 transition-transform hover:-translate-y-1"
          >
            <div className="flex gap-[3px]">
              {[...Array(5)].map((_, j) => (
                <Star key={j} weight="fill" className="text-[#f59e0b] text-[1.1rem]" />
              ))}
            </div>
            <p className="text-[0.85rem] leading-[1.7] text-on-surface italic relative">
              <span className="font-serif text-[2.5rem] leading-[0] text-primary-container mr-1 align-[-0.75rem]">"</span>
              {testi.quote}
            </p>
            <div className="flex items-center gap-3 mt-auto pt-4">
              <div className="w-[38px] h-[38px] rounded-lg flex-shrink-0 flex items-center justify-center text-[0.78rem] font-bold text-primary bg-primary-container">
                {testi.initials}
              </div>
              <div>
                <div className="text-[0.82rem] font-bold text-on-surface">{testi.author}</div>
                <div className="text-[0.72rem] text-on-surface-variant mb-1">{testi.role}</div>
                <div className="inline-flex items-center gap-1 text-[0.65rem] font-bold tracking-[0.06em] uppercase px-[0.55rem] py-[0.2rem] rounded-[4px] bg-primary-container text-primary">
                  {testi.tag}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
