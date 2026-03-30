"use client";

import React from "react";
import { motion } from "framer-motion";

export function StatsBand() {
  const stats = [
    { num: "4,200", unit: "+", desc: "Licensed therapists\nacross 50 states" },
    { num: "92", unit: "%", desc: "Patients report\nmeasurable progress" },
    { num: "3.4", unit: "×", desc: "Better outcomes vs.\ntherapy alone" },
    { num: "24", unit: "/7", desc: "AI companion\nalways available" },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div className="bg-surface-container-lowest py-16 px-6 md:px-12 border-y border-outline-variant">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-[1140px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
      >
        {stats.map((stat, i) => (
          <motion.div key={i} variants={item} className="text-center">
            <div className="font-serif text-[2.75rem] text-on-surface tracking-[-0.02em] leading-none mb-2">
              {stat.num}
              <span className="text-primary">{stat.unit}</span>
            </div>
            <div className="text-[0.82rem] text-on-surface-variant leading-relaxed whitespace-pre-line">
              {stat.desc}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
