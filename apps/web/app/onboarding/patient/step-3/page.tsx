"use client"
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import {
  SquaresFour,
  CloudFog,
  Moon,
  Briefcase,
  Users,
  Bed,
  Heart,
  ChatCircle,
  PencilSimple,
} from "@phosphor-icons/react";
import { OnboardingLayout } from "@/features/onboarding/components/OnboardingLayout";
import { BottomBar } from "@/features/onboarding/components/BottomBar";
import { CareCard } from "@/features/onboarding/components/CareCard";
import { Textarea } from "@repo/ui";

import { updatePatientProfile, getProfile } from "../../actions";
import { useOnboardingRedirect } from "@/features/onboarding/hooks/useOnboardingRedirect";
import { useLocalStorage } from "@/hooks/useLocalStorage";
type Reason =
  | "anxious"
  | "low"
  | "stress"
  | "relationship"
  | "sleep"
  | "trauma"
  | "talk"
  | "other"
  | null;

const REASON_LABELS: Record<Exclude<Reason, null>, string> = {
  anxious: "Feeling anxious or overwhelmed",
  low: "Feeling low or unmotivated",
  stress: "Stress from work or daily life",
  relationship: "Relationship or family concerns",
  sleep: "Trouble sleeping or relaxing",
  trauma: "Processing past experiences",
  talk: "Just want someone to talk to",
  other: "Something else",
};

export default function PatientStep3() {
  const router = useRouter();
  const { loading } = useOnboardingRedirect();
  const [selectedReason, setSelectedReason] = useLocalStorage<Reason>("patient_selectedReason", null);
  const [otherText, setOtherText] = useLocalStorage("patient_otherText", "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function sync() {
      const { data } = await getProfile("patient");
      if (data?.reasonForSeeking) {
        const reason = data.reasonForSeeking;
        const key = Object.keys(REASON_LABELS).find(
          (k) => REASON_LABELS[k as Exclude<Reason, null>] === reason
        ) as Reason;
        
        if (key && key !== "other") {
          setSelectedReason(key);
        } else {
          setSelectedReason("other");
          setOtherText(reason);
        }
      }
    }
    sync();
  }, []);

  if (loading) return null;

  const handleNext = async () => {
    if (!selectedReason) return;
    setSaving(true);
    setError("");
    const reasonForSeeking =
      selectedReason === "other" ? otherText : REASON_LABELS[selectedReason];
    try {
      const result = await updatePatientProfile({ reasonForSeeking });
      if (result.error) throw new Error(result.error);
      router.push("/onboarding/patient/step-4");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout>
      <p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem]">
        Step 3 of 4 &bull; Clinical Context
      </p>

      <h1 className="text-[clamp(2rem,5vw,2.75rem)] font-extrabold tracking-[-0.02em] text-[var(--on-surface)] text-center w-full leading-[1.15] mb-[1rem]">
        Tell us about your health<br />journey.
      </h1>

      <p className="text-[0.95rem] font-normal text-[var(--on-surface-variant)] text-center leading-[1.65] max-w-[440px] mb-[3rem]">
        Our clinical context assessment helps us match you with the most appropriate care path.
        Please select the primary focus for today&apos;s visit.
      </p>

      {/* Reason for seeking care */}
      <div className="w-full mb-[3.5rem]">
        <div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] w-full">
          <SquaresFour weight="bold" size={16} className="opacity-55" />
          Reason for seeking care
        </div>

        <div className="flex flex-col gap-[0.75rem] w-full mb-6">
          <CareCard icon={<CloudFog weight="fill" size={20} />} title="Feeling anxious or overwhelmed" description="Racing thoughts, constant worry, or feeling mentally overloaded." selected={selectedReason === "anxious"} onClick={() => setSelectedReason("anxious")} />
          <CareCard icon={<Moon weight="fill" size={20} />} title="Feeling low or unmotivated" description="Low mood, lack of energy, or difficulty finding motivation." selected={selectedReason === "low"} onClick={() => setSelectedReason("low")} />
          <CareCard icon={<Briefcase weight="fill" size={20} />} title="Stress from work or daily life" description="Burnout, pressure, or difficulty managing responsibilities." selected={selectedReason === "stress"} onClick={() => setSelectedReason("stress")} />
          <CareCard icon={<Users weight="fill" size={20} />} title="Relationship or family concerns" description="Conflict, communication issues, or emotional strain." selected={selectedReason === "relationship"} onClick={() => setSelectedReason("relationship")} />
          <CareCard icon={<Bed weight="fill" size={20} />} title="Trouble sleeping or relaxing" description="Difficulty falling asleep, staying asleep, or feeling rested." selected={selectedReason === "sleep"} onClick={() => setSelectedReason("sleep")} />
          <CareCard icon={<Heart weight="fill" size={20} />} title="Processing past experiences" description="Working through trauma or unresolved emotions." selected={selectedReason === "trauma"} onClick={() => setSelectedReason("trauma")} />
          <CareCard icon={<ChatCircle weight="fill" size={20} />} title="Just want someone to talk to" description="Looking for a safe space to express and be heard." selected={selectedReason === "talk"} onClick={() => setSelectedReason("talk")} />
          <CareCard icon={<PencilSimple weight="fill" size={20} />} title="Something else" description="Tell us in your own words." selected={selectedReason === "other"} onClick={() => setSelectedReason("other")} />
        </div>

        {selectedReason === "other" && (
          <div className="w-full -mt-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col gap-[0.45rem]">
              <label className="text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)]">
                Tell us more
              </label>
              <Textarea
                rows={3}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Describe what you're going through..."
                className="resize-none leading-[1.6]"
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm -mt-6 mb-4">{error}</p>}

      <BottomBar
        totalSteps={4}
        currentStep={3}
        nextLabel={saving ? "Saving…" : "Continue"}
        onNext={handleNext}
        showBack={true}
        disabled={!selectedReason || (selectedReason === "other" && !otherText.trim()) || saving}
      />
    </OnboardingLayout>
  );
}
