"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  House, 
  ChatCircleText, 
  Users, 
  MagnifyingGlass,
  Gear,
  SignOut,
  Sparkle
} from "@phosphor-icons/react";
import { cn } from "@repo/ui";
import { useEffect, useState } from "react";
import { getConnections, checkOnboardingStatus } from "@/app/onboarding/actions";

interface Connection {
  id: string;
  therapistName?: string;
  patientName?: string;
  status: string;
  sessionId?: string;
  therapistStatus?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // 1. Get current role
        const status = await checkOnboardingStatus();
        const activeRole = status.role || 'patient';
        setRole(activeRole);

        // 2. Load connections for that role
        const result = await getConnections(activeRole as any);
        if (result.success && result.data) {
          setConnections(result.data);
        }
      } catch (e) {
        console.error("Failed to load connections:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isTherapist = role === 'therapist';

  const navItems = [
    { label: "Home", href: isTherapist ? "/connections" : "/recommendations", icon: House },
    { label: "Network", href: "/connections", icon: Users, hidden: !isTherapist },
    { label: "Messages", href: "/chat", icon: ChatCircleText },
    { label: "Explore", href: "/recommendations", icon: MagnifyingGlass, hidden: isTherapist },
  ].filter(i => !i.hidden);

  return (
    <aside className="w-[280px] h-screen bg-[var(--surface-container-lowest)] border-r border-[var(--outline-variant)] flex flex-col sticky top-0">
      {/* Brand */}
      <div className="p-6 mb-2">
        <Link href={isTherapist ? "/connections" : "/recommendations"} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Sparkle weight="fill" size={18} />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-[var(--on-surface)]">
            Sama
          </span>
        </Link>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 px-4 space-y-1">
        <div className="px-2 mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
          Menu
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] transition-all duration-200 group relative",
                isActive 
                  ? "bg-[var(--secondary-container)] text-[var(--on-secondary-container)] font-bold shadow-sm"
                  : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)]"
              )}
            >
              <item.icon 
                weight={isActive ? "fill" : "regular"} 
                size={22} 
                className={cn(isActive ? "text-[var(--primary)]" : "group-hover:text-[var(--primary)]")}
              />
              <span className="text-[0.9rem]">{item.label}</span>
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-[var(--primary)] rounded-r-full" />
              )}
            </Link>
          );
        })}

        {/* Connections Section */}
        <div className="pt-8 mb-2 px-2 text-[0.65rem] font-bold uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
          {isTherapist ? "Your Patients" : "Your Clinicians"}
        </div>
        
        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 customize-scrollbar">
          {loading ? (
            [1, 2].map(i => <div key={i} className="h-10 animate-pulse bg-[var(--surface-container-low)] rounded-lg m-1" />)
          ) : connections.length === 0 ? (
            <p className="px-3 text-[0.75rem] text-[var(--on-surface-variant)] italic opacity-60">
              No active connections yet.
            </p>
          ) : (
            connections.map((conn) => {
              const name = conn.therapistName || conn.patientName || "Anonymous";
              const chatPath = conn.sessionId ? `/chat/${conn.sessionId}` : `/chat?connectionId=${conn.id}`;
              const isActive = pathname.includes(conn.id) || (conn.sessionId && pathname.includes(conn.sessionId));
              
              return (
                <Link
                  key={conn.id}
                  href={chatPath}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-[var(--r-md)] transition-all group",
                    isActive 
                      ? "bg-[var(--surface-container-low)] text-[var(--on-surface)] font-semibold"
                      : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)]"
                  )}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0 relative">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} 
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                    {/* Status Indicator */}
                    {conn.status === 'accepted' && (
                      <div 
                        className={cn(
                          "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white",
                          conn.therapistStatus === 'online' ? "bg-emerald-500" : "bg-slate-300"
                        )} 
                        title={conn.therapistStatus === 'online' ? "Online" : "Offline"}
                      />
                    )}
                  </div>
                  <span className="text-[0.85rem] truncate">{name}</span>
                  {conn.status === 'pending' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-auto" title="Pending approval" />
                  )}
                </Link>
              );
            })
          )}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-[var(--outline-variant)] space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] rounded-lg transition-colors text-[0.85rem]">
          <Gear size={20} />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-[0.85rem]">
          <SignOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
