import { ReactNode } from "react";

interface RoleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  pills: string[];
  selected: boolean;
  onClick: () => void;
}

export function RoleCard({
  icon,
  title,
  description,
  pills,
  selected,
  onClick,
}: RoleCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        boxShadow: selected ? "0 0 0 2px var(--primary)" : "var(--shadow)",
      }}
      className={`relative p-[1.35rem] rounded-[var(--r-md)] flex items-start gap-[1.1rem] cursor-pointer transition-all duration-180 ${
        selected
          ? "bg-[var(--surface-container-lowest)]"
          : "bg-[var(--surface-container-lowest)] hover:bg-[var(--surface-bright)]"
      }`}
    >
      <div
        className={`w-[52px] h-[52px] rounded-[var(--r-sm)] flex items-center justify-center shrink-0 transition-colors duration-180 ${
          selected
            ? "bg-[var(--on-surface)] text-[var(--on-primary)]"
            : "bg-[var(--surface-container-low)] text-[var(--on-surface-variant)]"
        }`}
      >
        {icon}
      </div>

      <div className="flex-1">
        <h3 className="text-[1rem] font-bold text-[var(--on-surface)] mb-[0.3rem] tracking-[-0.01em]">
          {title}
        </h3>
        <p className="text-[0.8rem] text-[var(--on-surface-variant)] leading-[1.55]">
          {description}
        </p>

        <div className="flex flex-wrap gap-[0.4rem] mt-[0.75rem]">
          {pills.map((pill, idx) => (
            <span
              key={idx}
              className={`text-[0.62rem] font-bold tracking-[0.08em] uppercase px-[0.55rem] py-[0.22rem] rounded-[var(--r-sm)] ${
                selected
                  ? "bg-[var(--primary-container)] text-[var(--primary)]"
                  : "bg-[var(--surface-container-low)] text-[var(--on-surface-variant)]"
              }`}
            >
              {pill}
            </span>
          ))}
        </div>
      </div>

      {selected && (
        <div className="absolute top-[0.95rem] right-[1.1rem] w-[9px] h-[9px] rounded-full bg-[var(--on-surface)]" />
      )}
    </div>
  );
}
