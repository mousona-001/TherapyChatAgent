"use client"

import React, { useState } from "react"
import { Input, Button } from "@repo/ui"
import {
  MagnifyingGlass,
  Sparkle,
  Star,
  Robot,
} from "@phosphor-icons/react"
import { cn } from "@repo/ui/lib/utils"

const CHIPS = [
  "CBT",
  "Anxiety",
  "Trauma",
  "Family Therapy",
  "Depression",
  "Mindfulness",
]

const THERAPISTS = [
  {
    id: "er",
    match: 98,
    initials: "ER",
    name: "Dr. Elena Rossi",
    rating: 4.9,
    reviews: 126,
    role: "CLINICAL PSYCHOLOGIST",
    tags: ["Cognitive Behavioral", "Trauma-Informed", "Adults"],
    bio: "Specializing in neuro-divergent friendly approaches and deep trauma processing for long-term healing.",
    nextSlot: "Today, 4:00 PM",
    isOnline: true,
  },
  {
    id: "mt",
    match: 95,
    initials: "MT",
    name: "Dr. Marcus Thorne",
    rating: 4.8,
    reviews: 89,
    role: "PSYCHIATRIST",
    tags: ["Mood Disorders", "Med Management", "Bipolar"],
    bio: "Expert in clinical psychopharmacology with a focus on holistic recovery and long-term wellbeing.",
    nextSlot: "Tomorrow, 10:30 AM",
    isOnline: false,
  },
  {
    id: "sj",
    match: 92,
    initials: "SJ",
    name: "Sarah Jenkins, LCSW",
    rating: 5.0,
    reviews: 212,
    role: "SOCIAL WORKER",
    tags: ["Family Dynamics", "Child Therapy", "Play Therapy"],
    bio: "Dedicated to healing family structures and helping children express complex emotions safely.",
    nextSlot: "Wed, 9:00 AM",
    isOnline: true,
  },
  {
    id: "jv",
    match: 89,
    initials: "JV",
    name: "Dr. Julian Vane",
    rating: 4.7,
    reviews: 56,
    role: "COUNSELLOR",
    tags: ["Anxiety", "Work-Life Balance", "Mindfulness"],
    bio: "Helping high-performance professionals manage burnout through mindfulness-based interventions.",
    nextSlot: "Friday, 1:00 PM",
    isOnline: false,
  },
]

export default function FindTherapistPage() {
  const [activeChips, setActiveChips] = useState<string[]>(["Trauma"])

  const toggleChip = (chip: string) => {
    setActiveChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Sticky Header */}
      <div className="shrink-0 pt-6 pb-5 px-8 border-b border-outline-variant bg-[rgba(249,249,255,0.96)]">
        <h1 className="text-[clamp(1.4rem,2.5vw,1.85rem)] font-extrabold tracking-[-0.02em] text-on-surface">
          Find Your Therapist
        </h1>
        <p className="text-[0.84rem] text-on-surface-variant mt-1.5">
          Matched to your care profile using our semantic engine.
        </p>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-8 pt-7 pb-12 customize-scrollbar">
        {/* Search Bar Container */}
        <div className="bg-surface-container-lowest rounded-md p-5 pb-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] mb-7 flex flex-col gap-4">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-50 z-10" size={16} />
            <Input
              type="text"
              placeholder="Search by name, specialty, or approach..."
              className="w-full pl-10 pr-4 py-6 font-manrope text-[0.85rem] text-on-surface bg-surface-container-low border-transparent rounded-sm focus-visible:bg-surface-container-lowest focus-visible:border-b-primary focus-visible:border-b-2 focus-visible:ring-0 focus-visible:shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] transition-all placeholder:text-on-surface-variant placeholder:opacity-55"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((chip) => {
              const isActive = activeChips.includes(chip)
              return (
                <button
                  key={chip}
                  onClick={() => toggleChip(chip)}
                  className={cn(
                    "font-manrope text-[0.72rem] font-bold px-3 py-1.5 rounded-sm border-none cursor-pointer transition-colors duration-150",
                    isActive
                      ? "bg-on-surface text-white"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-on-surface/10"
                  )}
                >
                  {chip}
                </button>
              )
            })}
            <button className="font-manrope text-[0.72rem] font-bold px-3 py-1.5 rounded-sm border-none cursor-pointer transition-colors duration-150 bg-primary-container text-primary flex items-center gap-1.5 hover:opacity-90">
              <Sparkle weight="fill" className="text-[0.8rem]" /> AI-Guided
            </button>
          </div>
        </div>

        {/* Section Label */}
        <div className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant mb-4">
          <Star weight="fill" className="text-[0.95rem] opacity-55" />
          Top matches for you
        </div>

        {/* Therapist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
          {THERAPISTS.map((t) => (
            <div
              key={t.id}
              className="bg-surface-container-lowest rounded-md p-5 pb-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] flex flex-col gap-3 relative cursor-pointer transition-all duration-200 hover:shadow-[0_4px_20px_-4px_rgba(0,50,101,0.13)] hover:-translate-y-[1px]"
            >
              {/* Match Badge */}
              <div className="absolute top-0 right-4 text-[0.58rem] font-extrabold tracking-[0.08em] uppercase bg-primary text-white px-2.5 py-1 rounded-b-sm">
                {t.match}% Match
              </div>

              {/* Card Top */}
              <div className="flex items-start gap-3.5 pt-1.5">
                <div className="relative shrink-0">
                  <div className="w-[52px] h-[52px] rounded-md bg-primary-container flex items-center justify-center text-[0.95rem] font-extrabold text-primary tracking-[-0.01em]">
                    {t.initials}
                  </div>
                  {t.isOnline && (
                    <span className="w-[9px] h-[9px] rounded-full bg-[#2dbe7a] border-2 border-white absolute -bottom-[2px] -right-[2px]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="text-[0.95rem] font-extrabold text-on-surface tracking-[-0.01em] leading-[1.2] mb-1">
                    {t.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[0.73rem] font-semibold text-on-surface-variant mb-1.5">
                    <Star weight="fill" className="text-[#f5a623]" /> {t.rating} <span className="opacity-55 font-medium">({t.reviews} reviews)</span>
                  </div>
                  <div className="text-[0.58rem] font-extrabold uppercase tracking-[0.1em] text-primary">
                    {t.role}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[0.67rem] font-semibold px-2.5 py-1 rounded-sm bg-surface-container-low text-on-surface-variant"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Bio */}
              <p className="text-[0.78rem] text-on-surface-variant leading-[1.6] line-clamp-2 overflow-hidden mt-1">
                {t.bio}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 mt-1.5 border-t border-surface-container">
                <span className="text-[0.73rem] text-on-surface-variant font-medium">
                  Next: <strong className="text-primary font-bold">{t.nextSlot}</strong>
                </span>
                <Button className="font-manrope text-[0.73rem] font-bold text-white bg-on-surface hover:bg-on-surface/80 rounded-sm px-4 py-1.5 h-auto">
                  Book Now
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* AI Card */}
        <div className="bg-primary-container rounded-md p-6 flex flex-col md:flex-row items-center gap-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] mt-4">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-primary mb-2">
              <Robot weight="fill" className="text-[0.7rem]" /> Deep Discovery AI
            </div>
            <h3 className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-on-surface leading-[1.2] mb-1.5">
              Can&apos;t find the perfect match?
            </h3>
            <p className="text-[0.78rem] text-on-surface-variant leading-[1.6] mb-3.5 max-w-lg">
              Let our AI analyse your intake patterns to recommend specialised practitioners from our global network.
            </p>
            <Button className="font-manrope text-[0.78rem] font-bold text-white bg-primary hover:bg-primary/90 hover:-translate-y-[1px] transition-all rounded-sm px-5 py-5 h-auto flex items-center gap-2 shadow-[0_4px_16px_-4px_rgba(73,75,214,0.35)]">
              <Sparkle weight="fill" /> Begin Deep Analysis
            </Button>
          </div>
          <div className="shrink-0 w-[90px] h-[90px] rounded-md bg-surface-container-lowest flex items-center justify-center">
            <div className="w-[50px] h-[50px] rounded-full bg-primary flex items-center justify-center text-white text-[1.35rem] shadow-[0_0_0_9px_var(--color-primary-container)]">
              <Sparkle weight="fill" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
