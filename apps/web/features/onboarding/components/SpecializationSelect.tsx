"use client"
import { KeyboardEvent, useState } from "react";

import { Check, Plus, X } from "@phosphor-icons/react";
import { Button, Input } from "@repo/ui";

const DEFAULT_SPECIALIZATIONS = [
  "CBT",
  "DBT",
  "Trauma",
  "EMDR",
  "Family Therapy",
  "Mindfulness",
  "Addiction",
  "Grief & Loss",
  "Anxiety & OCD",
  "Child & Adolescent",
];

interface SpecializationSelectProps {
  selected: string[];
  onChange: (specs: string[]) => void;
}

export function SpecializationSelect({ selected, onChange }: SpecializationSelectProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSpec, setNewSpec] = useState("");

  const toggleSpec = (spec: string) => {
    if (selected.includes(spec)) {
      onChange(selected.filter((s) => s !== spec));
    } else {
      onChange([...selected, spec]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = newSpec.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setNewSpec("");
    setIsAdding(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    } else if (e.key === "Escape") {
      setNewSpec("");
      setIsAdding(false);
    }
  };

  const allSpecs = Array.from(new Set([...DEFAULT_SPECIALIZATIONS, ...selected]));

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {allSpecs.map((spec) => {
        const isSelected = selected.includes(spec);
        const isCustom = !DEFAULT_SPECIALIZATIONS.includes(spec);

        return (
          <Button
            key={spec}
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              toggleSpec(spec);
            }}
            className={`flex items-center gap-[0.3rem] px-[0.85rem] h-auto py-[0.4rem] rounded-[var(--r-sm)] text-[0.8rem] font-semibold select-none relative group border-none shadow-none ${
              isSelected
                ? "bg-[var(--primary-container)] text-[var(--primary)] hover:bg-[var(--primary-container)]"
                : "bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]"
            }`}
          >
            {isSelected && <Check weight="bold" size={12} />}
            {spec}
            {isCustom && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  toggleSpec(spec);
                }}
                className="absolute -top-[6px] -right-[6px] w-[16px] h-[16px] rounded-full bg-[var(--on-surface)] text-white text-[10px] flex items-center justify-center opacity-0 scale-80 transition-all group-hover:opacity-100 group-hover:scale-100 shadow-md"
              >
                <X weight="bold" />
              </div>
            )}
          </Button>
        );
      })}

      {isAdding ? (
        <Input
          type="text"
          value={newSpec}
          onChange={(e) => setNewSpec(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddCustom}
          autoFocus
          placeholder="Type..."
          className="h-auto py-[0.4rem] px-[0.85rem] text-[0.8rem] font-semibold bg-[var(--surface-container-lowest)] border border-[var(--primary)] outline-none w-[120px]"
        />
      ) : (
        <Button
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            setIsAdding(true);
          }}
          className="flex items-center gap-[0.3rem] px-[0.85rem] h-auto py-[0.4rem] bg-transparent rounded-[var(--r-sm)] border-[1.5px] border-dashed border-[rgba(73,75,214,0.3)] text-[0.8rem] font-semibold text-[var(--on-surface-variant)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-transparent"
        >
          <Plus weight="bold" size={12} /> Add other
        </Button>
      )}
    </div>
  );
}
