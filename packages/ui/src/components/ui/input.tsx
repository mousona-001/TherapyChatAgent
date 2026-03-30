import * as React from "react"

import { cn } from "../../lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-[52px] w-full items-center px-4",
        "bg-[var(--surface-container-low)] text-[var(--on-surface)] text-[0.95rem] font-medium",
        "rounded-[var(--r-sm)] border-b-2 border-transparent outline-none",
        "transition-all placeholder:text-[var(--on-surface-variant)] placeholder:font-normal",
        "hover:bg-[var(--surface-container-high)] focus:bg-[var(--surface-container-lowest)] focus:border-b-[var(--primary)] focus:shadow-sm",
        "disabled:opacity-70 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

export { Input }
