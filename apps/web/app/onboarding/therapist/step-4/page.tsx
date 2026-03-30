"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChatDots,
  Sparkle,
  Leaf,
  Lightning,
  Flask,
  Heart,
  RocketLaunch,
  Stethoscope,
  Robot,
} from "@phosphor-icons/react";
import { OnboardingLayout } from "@/features/onboarding/components/OnboardingLayout";
import { BottomBar } from "@/features/onboarding/components/BottomBar";
import { useOnboardingRedirect } from "@/features/onboarding/hooks/useOnboardingRedirect";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useEffect } from "react";

type CommunicationStyle = "Gentle" | "Direct" | "Analytical";
type AITone = "Empathetic" | "Motivational" | "Clinical";

const PREVIEWS: Record<`${CommunicationStyle}-${AITone}`, string> = {
  "Gentle-Motivational":
    '"It sounds like today\'s session brought up some really meaningful emotions. You\'re making important progress — each small step forward is something to acknowledge."',
  "Gentle-Empathetic":
    '"I hear you — what you\'re carrying right now is a lot. It\'s okay to take this at your own pace. Your feelings are completely valid."',
  "Gentle-Clinical":
    '"Session notes indicate elevated emotional activation. Patient demonstrated resilience across multiple discussion threads. Progress is being observed."',
  "Direct-Motivational":
    "\"Good session. You identified the core issue and pushed through. That's exactly the kind of breakthrough that moves the needle — keep it up.\"",
  "Direct-Empathetic":
    '"You showed real courage today. Tough conversations aren\'t easy, but you handled it. That matters."',
  "Direct-Clinical":
    '"Session outcome: productive. Key themes addressed. Recommended follow-up: reinforce coping strategies identified in session."',
  "Analytical-Motivational":
    '"A pattern of avoidance was noted and directly challenged — a measurable shift from prior sessions. The data supports continued progress on this trajectory."',
  "Analytical-Empathetic":
    '"The emotional responses you described align with established patterns in your history. Recognizing these links is a significant therapeutic milestone."',
  "Analytical-Clinical":
    '"Clinical summary: patient demonstrated insight into cognitive distortions. Evidence-based markers indicate improvement. Recommend continuation of current protocol."',
};

interface StyleTileProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function StyleTile({ icon, label, description, selected, onClick }: StyleTileProps) {
  return (
    <div
      onClick={onClick}
      style={{
        boxShadow: selected ? "0 0 0 2px var(--primary)" : "var(--shadow)",
      }}
      className={`relative flex flex-col items-center gap-[0.6rem] text-center p-[1.25rem_1rem_1rem] rounded-[var(--r-md)] cursor-pointer select-none transition-all duration-180 ${
        selected
          ? "bg-[var(--surface-container-lowest)]"
          : "bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)]"
      }`}
    >
      <div
        className={`w-[44px] h-[44px] rounded-[var(--r-sm)] flex items-center justify-center transition-colors duration-180 ${
          selected
            ? "bg-[var(--on-surface)] text-[var(--on-primary)]"
            : "bg-[var(--surface-container-lowest)] text-[var(--on-surface-variant)]"
        }`}
      >
        {icon}
      </div>
      <span className="text-[0.88rem] font-bold text-[var(--on-surface)] tracking-[-0.01em]">
        {label}
      </span>
      <span className="text-[0.72rem] text-[var(--on-surface-variant)] leading-[1.5]">
        {description}
      </span>
      {selected && (
        <div className="absolute top-[0.65rem] right-[0.65rem] w-[8px] h-[8px] rounded-full bg-[var(--primary)]" />
      )}
    </div>
  );
}

import { updateTherapistProfile, getProfile } from "../../actions";

// ... (PREVIEWS and StyleTile)

export default function TherapistStep4() {
  const router = useRouter();
  const [commStyle, setCommStyle] = useLocalStorage<CommunicationStyle>("therapist_commStyle", "Gentle");
  const [aiTone, setAiTone] = useLocalStorage<AITone>("therapist_aiTone", "Motivational");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { loading } = useOnboardingRedirect();

  useEffect(() => {
    async function sync() {
      const { data } = await getProfile("therapist");
      if (data) {
        if (data.communicationStyle) setCommStyle(data.communicationStyle as CommunicationStyle);
        if (data.tone) setAiTone(data.tone as AITone);
      }
    }
    sync();
  }, []);

  if (loading) return null;

  const handleFinish = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await updateTherapistProfile({
        communicationStyle: commStyle,
        tone: aiTone,
      });
      if (result.error) throw new Error(result.error);
      router.push("/chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
      setSaving(false);
    }
  };

  const currentPreview = PREVIEWS[`${commStyle}-${aiTone}`] || PREVIEWS["Gentle-Motivational"];

  return (
    <OnboardingLayout>
      <p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem]">
        Step 4 of 4 &bull; AI Style Markers
      </p>

      <h1 className="text-[clamp(2rem,5vw,2.75rem)] font-extrabold tracking-[-0.02em] text-[var(--on-surface)] text-center w-full leading-[1.15] mb-[1rem]">
        Shape your<br />Sanctuary Bot.
      </h1>

      <p className="text-[0.95rem] font-normal text-[var(--on-surface-variant)] text-center leading-[1.65] max-w-[460px] mb-[3rem]">
        This determines how the Sanctuary Bot drafts responses and session summaries for your review
        — so every word sounds like you.
      </p>

      {/* Communication Style */}
      <div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] w-full">
        <ChatDots weight="bold" size={16} className="opacity-55" />
        Communication style
      </div>

      <div className="bg-[var(--surface-container-lowest)] rounded-[var(--r-lg)] p-6 w-full shadow-[var(--shadow)] mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StyleTile icon={<Leaf size={24} weight="fill" />} label="Gentle" description="Soft phrasing, high cushioning, supportive atmosphere." selected={commStyle === "Gentle"} onClick={() => setCommStyle("Gentle")} />
          <StyleTile icon={<Lightning size={24} weight="fill" />} label="Direct" description="Action-oriented, concise, focused on breakthroughs." selected={commStyle === "Direct"} onClick={() => setCommStyle("Direct")} />
          <StyleTile icon={<Flask size={24} weight="fill" />} label="Analytical" description="Pattern-based, logical framing, evidence-linked." selected={commStyle === "Analytical"} onClick={() => setCommStyle("Analytical")} />
        </div>
      </div>

      {/* AI Tone */}
      <div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] mt-6 w-full">
        <Sparkle weight="bold" size={16} className="opacity-55" />
        AI tone
      </div>

      <div className="bg-[var(--surface-container-lowest)] rounded-[var(--r-lg)] p-6 w-full shadow-[var(--shadow)] mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StyleTile icon={<Heart size={24} weight="fill" />} label="Empathetic" description="Prioritizes emotional validation and safety." selected={aiTone === "Empathetic"} onClick={() => setAiTone("Empathetic")} />
          <StyleTile icon={<RocketLaunch size={24} weight="fill" />} label="Motivational" description="Encourages growth and celebrates small wins." selected={aiTone === "Motivational"} onClick={() => setAiTone("Motivational")} />
          <StyleTile icon={<Stethoscope size={24} weight="fill" />} label="Clinical" description="Neutral, professional, and highly objective." selected={aiTone === "Clinical"} onClick={() => setAiTone("Clinical")} />
        </div>
      </div>

      {/* Live Preview Callout */}
      <div className="flex items-start gap-3 bg-[var(--surface-container-low)] rounded-[var(--r-md)] p-[1rem_1.1rem] w-full mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="w-[36px] h-[36px] shrink-0 rounded-[var(--r-sm)] bg-[var(--primary-container)] flex items-center justify-center text-[var(--primary)]">
          <Robot size={20} weight="fill" />
        </div>
        <div className="flex-1">
          <strong className="block text-[0.78rem] font-bold text-[var(--on-surface)] mb-[0.3rem]">
            Sanctuary Bot preview
          </strong>
          <div className="relative text-[0.8rem] text-[var(--on-surface-variant)] leading-[1.6] bg-[var(--surface-container-lowest)] rounded-[var(--r-md)] p-[0.65rem_0.85rem] shadow-[var(--shadow)]">
            <div className="absolute top-[0.65rem] -left-[6px] w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-[var(--surface-container-lowest)]" />
            <em className="not-italic transition-all duration-300">{currentPreview}</em>
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm -mt-6 mb-4">{error}</p>}

      <BottomBar
        totalSteps={4}
        currentStep={4}
        nextLabel={saving ? "Saving…" : "Continue"}
        onNext={handleFinish}
        showBack={true}
        disabled={saving}
      />
    </OnboardingLayout>
  );
}
