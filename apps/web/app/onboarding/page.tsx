"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, BriefcaseMetal, UsersThree } from "@phosphor-icons/react";
import { OnboardingLayout } from "@/features/onboarding/components/OnboardingLayout";
import { RoleCard } from "@/features/onboarding/components/RoleCard";
import { TrustBadge } from "@/features/onboarding/components/TrustBadge";
import { BottomBar } from "@/features/onboarding/components/BottomBar";
import { useOnboardingRedirect } from "@/features/onboarding/hooks/useOnboardingRedirect";

type Role = "patient" | "therapist" | null;

export default function OnboardingStep1() {
  const router = useRouter();
  const { loading } = useOnboardingRedirect();
  const [selectedRole, setSelectedRole] = useState<Role>("patient"); // Default select

  if (loading) return null;

  const handleNext = () => {
    if (selectedRole === "patient") {
      router.push("/onboarding/patient/step-2");
    } else if (selectedRole === "therapist") {
      router.push("/onboarding/therapist/step-2");
    }
  };

  return (
    <OnboardingLayout>
      <p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem]">
        First things first &bull; Your role
      </p>

      <h1 className="text-[clamp(2rem,5vw,2.75rem)] font-extrabold tracking-[-0.02em] text-[var(--on-surface)] text-center w-full leading-[1.15] mb-[1rem]">
        How will you be<br />using Sama?
      </h1>

      <p className="text-[0.95rem] font-normal text-[var(--on-surface-variant)] text-center leading-[1.65] max-w-[440px] mb-[3rem]">
        We tailor your entire experience — your dashboard, tools, and workflows — based on how
        you'll use the platform.
      </p>

      {/* Role Selection Group */}
      <div className="w-full mb-[3rem]">
        <div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] w-full">
          <UsersThree className="opacity-55" size={16} weight="bold" />
          Choose your role
        </div>

        <div className="flex flex-col gap-[0.75rem] w-full">
          <RoleCard
            icon={<Heart weight="fill" size={24} />}
            title="Patient"
            description="I'm here to manage my wellbeing, connect with a therapist or provider, and track my mental health journey."
            pills={["Session booking", "Mood tracking", "Care journal", "Provider messaging"]}
            selected={selectedRole === "patient"}
            onClick={() => setSelectedRole("patient")}
          />

          <RoleCard
            icon={<BriefcaseMetal weight="fill" size={24} />}
            title="Therapist / Provider"
            description="I'm a licensed mental health professional looking to manage my client roster, sessions, and clinical notes."
            pills={["Client management", "Clinical notes", "Session scheduling", "Progress reports"]}
            selected={selectedRole === "therapist"}
            onClick={() => setSelectedRole("therapist")}
          />
        </div>
      </div>

      <TrustBadge
        icon="shield"
        title="How your role shapes your experience"
        description="Your role shapes your dashboard and tools. Switch anytime from your account settings."
      />

      <BottomBar
        totalSteps={4}
        currentStep={1}
        nextLabel="Continue"
        onNext={handleNext}
        disabled={!selectedRole}
      />
    </OnboardingLayout>
  );
}
