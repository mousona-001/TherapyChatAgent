import { ReactNode } from "react";

interface CareCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export function CareCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: CareCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        boxShadow: selected ? "0 0 0 2px var(--primary)" : "var(--shadow)",
      }}
      className={`relative p-[1.1rem_1.25rem] rounded-[var(--r-md)] flex items-start gap-4 cursor-pointer transition-all duration-180 ${
        selected
          ? "bg-[var(--surface-container-lowest)]"
          : "bg-[var(--surface-container-lowest)] hover:bg-[var(--surface-bright)]"
      }`}
    >
      <div
        className={`w-[42px] h-[42px] rounded-[var(--r-sm)] flex items-center justify-center shrink-0 transition-colors duration-180 ${
          selected
            ? "bg-[var(--on-surface)] text-[var(--on-primary)]"
            : "bg-[var(--surface-container-low)] text-[var(--on-surface-variant)]"
        }`}
      >
        {icon}
      </div>

      <div className="flex-1">
        <h3 className="text-[0.95rem] font-bold text-[var(--on-surface)] mb-[0.2rem] tracking-[-0.01em]">
          {title}
        </h3>
        <p className="text-[0.8rem] text-[var(--on-surface-variant)] leading-[1.55]">
          {description}
        </p>
      </div>

      {selected && (
        <div className="absolute top-[0.85rem] right-[1rem] w-[9px] h-[9px] rounded-full bg-[var(--on-surface)]" />
      )}
    </div>
  );
}
