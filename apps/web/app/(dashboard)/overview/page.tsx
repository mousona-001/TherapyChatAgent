"use client";

import {
  ArrowRight,
  CalendarBlank,
  ChatCircle,
  ChartLineUp,
  FirstAid,
  Heartbeat,
  Notebook,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";

const stats = [
  { label: "Sessions Completed", value: "12", sub: "+2 this month", color: "bg-primary-container text-primary" },
  { label: "Streak", value: "7 days", sub: "Keep it up!", color: "bg-tertiary-container text-tertiary" },
  { label: "Journal Entries", value: "24", sub: "+5 this week", color: "bg-secondary-container text-secondary" },
  { label: "Mood Score", value: "8 / 10", sub: "Feeling good", color: "bg-emerald-50 text-emerald-700" },
];

const quickActions = [
  {
    title: "Find a Therapist",
    description: "Browse AI-matched therapists tailored to your needs.",
    icon: UsersThree,
    href: "/find-therapist",
    color: "bg-primary-container text-primary",
  },
  {
    title: "Book a Session",
    description: "Schedule your next session with your therapist.",
    icon: CalendarBlank,
    href: "/sessions",
    color: "bg-secondary-container text-secondary",
  },
  {
    title: "Write in Journal",
    description: "Reflect on your day and track your mental health.",
    icon: Notebook,
    href: "/journal",
    color: "bg-tertiary-container text-tertiary",
  },
  {
    title: "Explore Resources",
    description: "Articles, exercises and tools for mental wellness.",
    icon: FirstAid,
    href: "/resources",
    color: "bg-emerald-50 text-emerald-700",
  },
];

const upcomingSessions = [
  {
    therapistName: "Dr. Priya Sharma",
    specialty: "Cognitive Behavioral Therapy",
    date: "Tomorrow, 3:00 PM",
    avatar: "/avatars/avatar1.png",
  },
  {
    therapistName: "Dr. Arjun Mehta",
    specialty: "Mindfulness & Stress",
    date: "Friday, 11:00 AM",
    avatar: "/avatars/avatar2.png",
  },
];

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-primary">
          <Sparkle weight="fill" className="w-5 h-5" />
          <span className="text-sm font-medium">Good morning</span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Welcome back</h1>
        <p className="text-sm text-on-surface-variant">
          Here&apos;s a snapshot of your mental wellness journey.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl p-4 flex flex-col gap-1 ${s.color}`}
          >
            <span className="text-2xl font-bold">{s.value}</span>
            <span className="text-xs font-medium opacity-80">{s.label}</span>
            <span className="text-[0.65rem] opacity-60">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Upcoming Sessions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
            <CalendarBlank className="w-4 h-4 text-primary" />
            Upcoming Sessions
          </h2>
          <Link
            href="/sessions"
            className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {upcomingSessions.map((s) => (
            <div
              key={s.therapistName}
              className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant bg-surface-container/40 hover:bg-surface-container/70 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <Heartbeat className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">
                  {s.therapistName}
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  {s.specialty}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-on-surface-variant">{s.date}</span>
                <button className="p-1.5 rounded-lg bg-primary-container text-primary hover:bg-primary/20 transition-colors">
                  <ChatCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
          <ChartLineUp className="w-4 h-4 text-primary" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex items-start gap-3 p-4 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container/50 transition-colors group"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${action.color}`}
              >
                <action.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                  {action.title}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-on-surface-variant/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
