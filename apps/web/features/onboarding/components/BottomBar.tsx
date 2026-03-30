"use client";

import { ArrowRight, ArrowLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";

interface BottomBarProps {
  totalSteps: number;
  currentStep: number;
  nextLabel?: string;
  onNext?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  disabled?: boolean;
}

export function BottomBar({
  totalSteps,
  currentStep,
  nextLabel = "Continue",
  onNext,
  showBack = false,
  onBack,
  disabled = false,
}: BottomBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 py-5 px-8 bg-[rgba(249,249,255,0.9)] backdrop-blur-[20px] border-t border-[var(--outline-variant)] flex items-center justify-between z-20">
      {/* Back Button Placeholder or Logic */}
      <div className="w-[100px] flex">
        {showBack ? (
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 h-9 text-[0.88rem] font-semibold text-[var(--on-surface-variant)] rounded-[var(--r-pill)]"
          >
            <ArrowLeft weight="bold" />
            Back
          </Button>
        ) : (
          <div className="w-20" /> // Spacer
        )}
      </div>

      <div className="flex gap-1.5 items-center">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNumber = i + 1;
          const isActive = stepNumber === currentStep;
          const isDone = stepNumber < currentStep;

          return (
            <div
              key={i}
              className={`h-[5px] rounded-sm transition-all duration-300 ${
                isActive
                  ? "bg-[var(--on-surface)] w-[40px]"
                  : isDone
                  ? "bg-[var(--primary)] w-[28px]"
                  : "bg-[var(--surface-container)] w-[28px]"
              }`}
            />
          );
        })}
      </div>

      <div className="w-[100px] flex justify-end">
        <Button
          onClick={onNext}
          disabled={disabled}
          className="flex items-center gap-2 px-6 h-12 text-[0.88rem] font-bold text-white bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dim)] border-none rounded-[var(--r-lg)] shadow-[0_4px_16px_-4px_rgba(73,75,214,0.35)] transition-all hover:-translate-y-[1px] hover:opacity-95 active:translate-y-0 disabled:opacity-50"
        >
          {nextLabel}
          <ArrowRight weight="bold" />
        </Button>
      </div>
    </div>
  );
}
