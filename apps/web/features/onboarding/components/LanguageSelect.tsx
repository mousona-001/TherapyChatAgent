"use client"
import { KeyboardEvent, useState } from "react";

import { Check, Plus, X } from "@phosphor-icons/react";
import { Button, Input } from "@repo/ui";

const DEFAULT_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Mandarin",
  "Arabic",
  "Portuguese",
  "Hindi",
];

interface LanguageSelectProps {
  selected: string[];
  onChange: (langs: string[]) => void;
}

export function LanguageSelect({ selected, onChange }: LanguageSelectProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLang, setNewLang] = useState("");

  const toggleLang = (lang: string) => {
    if (selected.includes(lang)) {
      onChange(selected.filter((l) => l !== lang));
    } else {
      onChange([...selected, lang]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = newLang.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setNewLang("");
    setIsAdding(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    } else if (e.key === "Escape") {
      setNewLang("");
      setIsAdding(false);
    }
  };

  // Merge default languages plus any custom ones already selected
  const allLangs = Array.from(new Set([...DEFAULT_LANGUAGES, ...selected]));

  return (
    <div className="flex flex-wrap gap-2">
      {allLangs.map((lang) => {
        const isSelected = selected.includes(lang);
        const isCustom = !DEFAULT_LANGUAGES.includes(lang);

        return (
          <Button
            key={lang}
            variant="outline"
            onClick={() => toggleLang(lang)}
            className={`flex items-center gap-[0.3rem] px-[0.75rem] h-auto py-[0.35rem] rounded-[var(--r-sm)] text-[0.78rem] font-semibold select-none relative group border-none shadow-none ${
              isSelected
                ? "bg-[var(--primary-container)] text-[var(--primary)] hover:bg-[var(--primary-container)]"
                : "bg-[var(--surface-container-low)] text-[var(--on-surface)] hover:bg-[var(--surface-container)]"
            }`}
          >
            {isSelected && <Check weight="bold" size={12} />}
            {lang}
            {isCustom && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLang(lang);
                }}
                className="absolute -top-[6px] -right-[6px] w-4 h-4 rounded-full bg-[var(--on-surface)] text-white text-[10px] flex items-center justify-center opacity-0 scale-80 transition-all group-hover:opacity-100 group-hover:scale-100"
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
          value={newLang}
          onChange={(e) => setNewLang(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddCustom}
          autoFocus
          placeholder="Language..."
          className="h-auto py-[0.35rem] px-[0.75rem] text-[0.78rem] font-semibold bg-[var(--surface-container-latest)] border border-[var(--primary)] outline-none w-[100px]"
        />
      ) : (
        <Button
          variant="ghost"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-[0.3rem] px-[0.75rem] h-auto py-[0.35rem] bg-transparent rounded-[var(--r-sm)] border-[1.5px] border-dashed border-[rgba(73,75,214,0.3)] text-[0.78rem] font-semibold text-[var(--on-surface-variant)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-transparent"
        >
          <Plus weight="bold" size={12} /> Add other
        </Button>
      )}
    </div>
  );
}
