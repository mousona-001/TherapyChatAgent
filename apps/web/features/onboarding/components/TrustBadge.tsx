import { ReactNode } from "react";
import { ShieldCheck, LockKey } from "@phosphor-icons/react";

interface TrustBadgeProps {
  icon: "shield" | "lock";
  title: string;
  description: string;
}

export function TrustBadge({ icon, title, description }: TrustBadgeProps) {
  return (
    <div className="flex items-start gap-3 bg-[var(--surface-container-low)] rounded-[var(--r-md)] p-4 w-full mb-10">
      <div className="w-9 h-9 shrink-0 rounded-[var(--r-sm)] bg-[var(--primary-container)] flex items-center justify-center text-[var(--primary)]">
        {icon === "shield" ? (
          <ShieldCheck size={20} weight="fill" />
        ) : (
          <LockKey size={20} weight="fill" />
        )}
      </div>
      <div className="flex-1">
        <strong className="block text-[0.78rem] font-bold text-[var(--on-surface)] mb-1 tracking-[-0.01em]">
          {title}
        </strong>
        <p className="text-[0.73rem] text-[var(--on-surface-variant)] leading-[1.55]">
          {description}
        </p>
      </div>
    </div>
  );
}
