"use client"

import * as React from "react"
import { format } from "date-fns"
import { DayPicker } from "react-day-picker"
import { CalendarIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

// Import react-day-picker default styles  
import "react-day-picker/style.css"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-[52px] w-full items-center gap-3 px-4",
            "bg-[var(--surface-container-low)] text-[var(--on-surface)] text-[0.95rem] font-medium",
            "rounded-[var(--r-sm)] border-b-2 border-transparent outline-none",
            "transition-all cursor-pointer text-left",
            "hover:bg-[var(--surface-container-high)] hover:shadow-xs",
            "data-[state=open]:border-b-[var(--primary)] data-[state=open]:bg-[var(--surface-container-lowest)]",
            "disabled:opacity-70 disabled:cursor-not-allowed",
            !value && "text-[var(--on-surface-variant)] font-normal",
            className
          )}
        >
          <CalendarIcon size={16} className="shrink-0 opacity-60" />
          {value ? format(value, "dd MMM yyyy") : <span>{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <style>{`
          .rdp-root {
            --rdp-accent-color: var(--primary);
            --rdp-accent-background-color: var(--primary-container);
            --rdp-day-width: 36px;
            --rdp-day-height: 36px;
            --rdp-font-family: inherit;
            color: var(--on-surface);
          }
          .rdp-month_caption { font-size: 0.85rem; font-weight: 700; color: var(--on-surface); padding: 0 0 0.5rem; }
          .rdp-weekday { font-size: 0.7rem; color: var(--on-surface-variant); font-weight: 600; }
          .rdp-day { font-size: 0.82rem; border-radius: var(--r-sm); }
          .rdp-day:hover:not([disabled]) { background: var(--surface-container); }
          .rdp-day_button { border-radius: var(--r-sm); }
          .rdp-selected .rdp-day_button { background: var(--primary); color: var(--on-primary); }
          .rdp-today:not(.rdp-selected) .rdp-day_button { color: var(--primary); font-weight: 800; }
          .rdp-nav button { color: var(--on-surface-variant); border-radius: var(--r-sm); }
          .rdp-nav button:hover { background: var(--surface-container); }
          .rdp-dropdown select { background: var(--surface-container-low); color: var(--on-surface); border: none; border-radius: var(--r-sm); font-size: 0.82rem; font-weight: 700; padding: 2px 6px; }
        `}</style>
        <DayPicker
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date)
            setOpen(false)
          }}
          defaultMonth={value}
          captionLayout="dropdown"
          fromYear={1920}
          toYear={new Date().getFullYear()}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  )
}
