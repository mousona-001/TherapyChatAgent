"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--surface-container-highest)] group-[.toaster]:text-[var(--on-surface)] group-[.toaster]:border-[var(--outline-variant)] group-[.toaster]:shadow-lg group-[.toaster]:rounded-[var(--r-md)]",
          description: "group-[.toast]:text-[var(--on-surface-variant)]",
          actionButton:
            "group-[.toast]:bg-[var(--primary)] group-[.toast]:text-[var(--on-primary)]",
          cancelButton:
            "group-[.toast]:bg-[var(--surface-variant)] group-[.toast]:text-[var(--on-surface-variant)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
