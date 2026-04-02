"use client"
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { Certificate, Brain, Minus, Plus } from "@phosphor-icons/react";
import { OnboardingLayout } from "@/features/onboarding/components/OnboardingLayout";
import { BottomBar } from "@/features/onboarding/components/BottomBar";
import { FormCard, FormGroup, FormLabel, FormRow2 } from "@/features/onboarding/components/FormCard";
import { SpecializationSelect } from "@/features/onboarding/components/SpecializationSelect";
import { Input, Combobox, Button } from "@repo/ui";
import { useOnboardingRedirect } from "@/features/onboarding/hooks/useOnboardingRedirect";
import { useLocalStorage } from "@/hooks/useLocalStorage";
const THERAPIST_TYPES = [
  { value: "Individual", label: "Individual Therapy" },
  { value: "Couples", label: "Couples Therapy" },
  { value: "Family", label: "Family Therapy" },
  { value: "Child", label: "Child & Adolescent Therapy" },
  { value: "Group", label: "Group Therapy" },
  { value: "Psychiatric", label: "Psychiatry / Medication Mgmt" },
  { value: "Other", label: "Other" },
];

const LICENSE_TYPES = [
  { value: "LCSW", label: "LCSW" },
  { value: "LPC", label: "LPC" },
  { value: "LMFT", label: "LMFT" },
  { value: "PhD", label: "PhD / PsyD" },
  { value: "MD", label: "MD / DO" },
  { value: "NP", label: "NP" },
  { value: "Other", label: "Other" },
];

import { updateTherapistProfile, getProfile } from "../../actions";

export default function TherapistStep3() {
  const router = useRouter();
  const { loading } = useOnboardingRedirect();
  const [yearsOfExperience, setYearsOfExperience] = useLocalStorage("therapist_yearsOfExperience", 1);
  const [specializations, setSpecializations] = useLocalStorage<string[]>("therapist_specializations", ["CBT", "Trauma"]);
  const [therapistType, setTherapistType] = useLocalStorage("therapist_therapistType", "");
  const [licenseNumber, setLicenseNumber] = useLocalStorage("therapist_licenseNumber", "");
  const [licenseType, setLicenseType] = useLocalStorage("therapist_licenseType", "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function sync() {
      const { data } = await getProfile("therapist");
      if (data) {
        if (data.yearsOfExperience !== undefined) setYearsOfExperience(data.yearsOfExperience);
        if (data.specializations) setSpecializations(data.specializations);
        if (data.therapistType) setTherapistType(data.therapistType);
        if (data.licenseNumber) setLicenseNumber(data.licenseNumber);
        if (data.licenseType) setLicenseType(data.licenseType);
      }
    }
    sync();
  }, []);

  if (loading) return null;

  const handleNext = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await updateTherapistProfile({
        therapistType: therapistType || undefined,
        licenseNumber: licenseNumber || undefined,
        licenseType: licenseType || undefined,
        yearsOfExperience,
        specializations,
      });
      if (result.error) throw new Error(result.error);
      router.push("/onboarding/therapist/step-4");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
      setSaving(false);
    }
  };

  const adjExperience = (delta: number) => {
    setYearsOfExperience((prev) => Math.max(0, Math.min(50, prev + delta)));
  };

  return (
    <OnboardingLayout>
      <p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem]">
        Step 3 of 4 &bull; Clinical Expertise
      </p>

      <h1 className="text-[clamp(2rem,5vw,2.75rem)] font-extrabold tracking-[-0.02em] text-[var(--on-surface)] text-center w-full leading-[1.15] mb-[1rem]">
        Your clinical<br />background.
      </h1>

      <p className="text-[0.95rem] font-normal text-[var(--on-surface-variant)] text-center leading-[1.65] max-w-[440px] mb-[3rem]">
        Help us match you with patients who need your specific expertise. Your clinical background
        ensures the highest quality of care.
      </p>

      {/* Professional Credentials */}
      <div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] w-full">
        <Certificate weight="bold" size={16} className="opacity-55" />
        Professional credentials
      </div>

      <FormCard>
        <FormGroup>
          <FormLabel>Role type</FormLabel>
          <Combobox
            options={THERAPIST_TYPES}
            value={therapistType}
            onChange={setTherapistType}
            placeholder="Select role type"
          />
        </FormGroup>
        <FormRow2>
          <FormGroup>
            <FormLabel>License number (NPI or State ID)</FormLabel>
            <Input
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. 1234567890"
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>License type</FormLabel>
            <Combobox
              options={LICENSE_TYPES}
              value={licenseType}
              onChange={setLicenseType}
              placeholder="Select type"
            />
          </FormGroup>
        </FormRow2>

        <FormGroup>
          <FormLabel>Years of experience</FormLabel>
          <div className="flex items-center gap-[0.75rem] bg-[var(--surface-container-low)] rounded-[var(--r-sm)] px-[0.75rem] py-[0.4rem] w-fit">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => adjExperience(-1)}
              className="bg-[var(--surface-container-lowest)] shadow-[var(--shadow)] hover:bg-[var(--primary-container)] hover:text-[var(--primary)] active:scale-95"
            >
              <Minus weight="bold" size={14} />
            </Button>
            <span className="text-[1rem] font-bold text-[var(--on-surface)] min-w-[2.5rem] text-center shrink-0">
              {yearsOfExperience}
            </span>
            <span className="text-[0.78rem] text-[var(--on-surface-variant)] font-medium">
              yrs
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => adjExperience(1)}
              className="bg-[var(--surface-container-lowest)] shadow-[var(--shadow)] hover:bg-[var(--primary-container)] hover:text-[var(--primary)] active:scale-95"
            >
              <Plus weight="bold" size={14} />
            </Button>
          </div>
        </FormGroup>
      </FormCard>

      {/* Clinical Specializations */}
      <div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] mt-6 w-full">
        <Brain weight="bold" size={16} className="opacity-55" />
        Clinical specializations
      </div>

      <FormCard>
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <FormLabel>Select all that apply</FormLabel>
            <span className="text-[0.72rem] text-[var(--on-surface-variant)] opacity-70">
              Multiple selections allowed
            </span>
          </div>
          <SpecializationSelect selected={specializations} onChange={setSpecializations} />
        </div>
      </FormCard>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <BottomBar
        totalSteps={4}
        currentStep={3}
        nextLabel={saving ? "Saving…" : "Continue"}
        onNext={handleNext}
        showBack={true}
        disabled={saving}
      />
    </OnboardingLayout>
  );
}
