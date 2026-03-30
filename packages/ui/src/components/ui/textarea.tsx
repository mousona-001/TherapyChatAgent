import * as React from "react"
import { cn } from "../../lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[120px] w-full rounded-[var(--r-sm)] px-4 py-4",
        "bg-[var(--surface-container-low)] text-[var(--on-surface)] text-[0.95rem] font-medium leading-[1.6]",
        "border-b-2 border-transparent outline-none transition-all placeholder:text-[var(--on-surface-variant)] placeholder:font-normal",
        "hover:bg-[var(--surface-container-high)] focus:bg-[var(--surface-container-lowest)] focus:border-b-[var(--primary)] focus:shadow-sm",
        "disabled:opacity-70 disabled:cursor-not-allowed resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
