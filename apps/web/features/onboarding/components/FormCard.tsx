import { ReactNode } from "react";

export function FormCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[var(--surface-container-lowest)] rounded-[var(--r-lg)] p-6 w-full shadow-[var(--shadow)] flex flex-col gap-5 mb-5">
      {children}
    </div>
  );
}

export function FormGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-[0.45rem] w-full">{children}</div>;
}

export function FormLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)]">
      {children}
    </label>
  );
}

export function FormRow2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">{children}</div>;
}

export function FormRow3({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">{children}</div>;
}
