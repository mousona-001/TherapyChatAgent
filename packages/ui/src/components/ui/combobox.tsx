"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-[52px] w-full items-center justify-between gap-3 px-4",
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
          <span>{selected ? selected.label : placeholder}</span>
          <ChevronsUpDownIcon size={15} className="shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command style={{ background: "var(--surface-container-lowest)", color: "var(--on-surface)" }}>
          <div style={{ borderBottom: "1px solid var(--outline-variant)" }}>
            <CommandInput
              placeholder={searchPlaceholder}
              style={{ color: "var(--on-surface)", fontSize: "0.9rem" }}
            />
          </div>
          <CommandList>
            <CommandEmpty style={{ color: "var(--on-surface-variant)", fontSize: "0.85rem" }}>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange?.(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                  style={{
                    background: value === option.value ? "var(--primary-container)" : undefined,
                    color: "var(--on-surface)",
                    fontSize: "0.88rem",
                    borderRadius: "var(--r-sm)",
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                  <CheckIcon
                    size={14}
                    className={cn(
                      "ml-auto",
                      value === option.value ? "opacity-100 text-[var(--primary)]" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
