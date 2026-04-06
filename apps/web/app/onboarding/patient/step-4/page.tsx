"use client";
import { useEffect, useState } from "react";

import { BottomBar } from "@/features/onboarding/components/BottomBar";
import {
	FormCard,
	FormGroup,
	FormLabel,
	FormRow2,
} from "@/features/onboarding/components/FormCard";
import { OnboardingLayout } from "@/features/onboarding/components/OnboardingLayout";
import {
	FileText,
	Heartbeat,
	SealCheck,
	ShieldCheck,
} from "@phosphor-icons/react";
import {
	Checkbox,
	Combobox,
	Input,
	PhoneInput,
	isValidPhoneNumber,
} from "@repo/ui";
import { useRouter } from "next/navigation";

import { useOnboardingRedirect } from "@/features/onboarding/hooks/useOnboardingRedirect";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getProfile, updatePatientProfile } from "../../actions";

const RELATIONSHIP_OPTIONS = [
	{ value: "Spouse / Partner", label: "Spouse / Partner" },
	{ value: "Parent", label: "Parent" },
	{ value: "Child", label: "Child" },
	{ value: "Sibling", label: "Sibling" },
	{ value: "Friend", label: "Friend" },
	{ value: "Guardian", label: "Guardian" },
	{ value: "Other", label: "Other" },
];

export default function PatientStep4() {
	const router = useRouter();
	const { loading } = useOnboardingRedirect();
	const [agreed, setAgreed] = useLocalStorage("patient_agreed", false);
	const [ecFirstName, setEcFirstName] = useLocalStorage(
		"patient_ecFirstName",
		"",
	);
	const [ecLastName, setEcLastName] = useLocalStorage("patient_ecLastName", "");
	const [ecPhone, setEcPhone] = useLocalStorage("patient_ecPhone", "");
	const [ecRelationship, setEcRelationship] = useLocalStorage(
		"patient_ecRelationship",
		"",
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		async function sync() {
			const { data } = await getProfile("patient");
			if (data?.emergencyContactName) {
				const parts = data.emergencyContactName.split(" ");
				setEcFirstName(parts[0] || "");
				setEcLastName(parts.slice(1).join(" ") || "");
			}
			if (data?.emergencyContactPhone) {
				setEcPhone(data.emergencyContactPhone.replace("+91", ""));
			}
		}
		sync();
	}, []);

	const isEcValid = !!(
		ecFirstName &&
		ecLastName &&
		ecPhone &&
		isValidPhoneNumber(ecPhone)
	);

	if (loading) return null;

	const handleFinish = async () => {
		if (!agreed) return;
		setSaving(true);
		setError("");
		try {
			const result = await updatePatientProfile({
				emergencyContactName:
					`${ecFirstName} ${ecLastName}`.trim() || undefined,
				emergencyContactPhone: ecPhone
					? `+91${ecPhone.replace(/\D/g, "")}`
					: undefined,
			});
			if (result.error) throw new Error(result.error);
			// Artificial delay to show saving state and look premium
			await new Promise((resolve) => setTimeout(resolve, 1500));
			router.push("/overview");
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "Failed to save. Please try again.",
			);
			setSaving(false);
		}
	};

	return (
		<OnboardingLayout>
			<p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem]">
				Step 4 of 4 &bull; Safety Net
			</p>

			<h1 className="text-[clamp(2rem,5vw,2.75rem)] font-extrabold tracking-[-0.02em] text-[var(--on-surface)] text-center w-full leading-[1.15] mb-[1rem]">
				Someone we can reach
				<br />
				if needed.
			</h1>

			<p className="text-[0.95rem] font-normal text-[var(--on-surface-variant)] text-center leading-[1.65] max-w-[440px] mb-[3rem]">
				In a clinical emergency, your care team may need to contact someone you
				trust. This information is stored securely and used only when your
				safety is at risk.
			</p>

			{/* Emergency Contact */}
			<div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] w-full">
				<Heartbeat weight="bold" size={16} className="opacity-55" />
				Emergency contact
			</div>

			<FormCard>
				<FormRow2>
					<FormGroup>
						<FormLabel>First name</FormLabel>
						<Input
							value={ecFirstName}
							onChange={(e) => setEcFirstName(e.target.value)}
							placeholder="e.g. Morgan"
							className="bg-[var(--surface-container-low)] border-0 border-b-2 border-b-transparent rounded-[var(--r-sm)] px-[0.85rem] py-[0.7rem] h-auto text-[0.9rem] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] placeholder:opacity-55 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b-[var(--primary)] focus-visible:bg-[var(--surface-container-lowest)] focus-visible:shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] transition-[background,border-color] duration-[180ms]"
						/>
					</FormGroup>
					<FormGroup>
						<FormLabel>Last name</FormLabel>
						<Input
							value={ecLastName}
							onChange={(e) => setEcLastName(e.target.value)}
							placeholder="e.g. Chen"
							className="bg-[var(--surface-container-low)] border-0 border-b-2 border-b-transparent rounded-[var(--r-sm)] px-[0.85rem] py-[0.7rem] h-auto text-[0.9rem] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] placeholder:opacity-55 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b-[var(--primary)] focus-visible:bg-[var(--surface-container-lowest)] focus-visible:shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] transition-[background,border-color] duration-[180ms]"
						/>
					</FormGroup>
				</FormRow2>

				<FormGroup>
					<FormLabel>Phone number</FormLabel>
					<PhoneInput
						value={ecPhone}
						onChange={setEcPhone}
						placeholder="98765 43210"
						defaultCountry="IN"
					/>
				</FormGroup>

				<FormGroup>
					<FormLabel>Relationship</FormLabel>
					<Combobox
						options={RELATIONSHIP_OPTIONS}
						value={ecRelationship}
						onChange={setEcRelationship}
						placeholder="Select relationship"
						searchPlaceholder="Search…"
					/>
				</FormGroup>
			</FormCard>

			{/* Clinical Consent */}
			<div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] mt-6 w-full">
				<SealCheck weight="bold" size={16} className="opacity-55" />
				Clinical consent
			</div>

			<div className="bg-[var(--surface-container-lowest)] rounded-[var(--r-lg)] p-6 w-full shadow-[var(--shadow)] mb-10 flex flex-col gap-4">
				<div className="flex items-start gap-3">
					<div className="w-[38px] h-[38px] shrink-0 rounded-[var(--r-sm)] bg-[var(--primary-container)] flex items-center justify-center text-[var(--primary)]">
						<FileText size={18} weight="fill" />
					</div>
					<div className="flex flex-col">
						<strong className="block text-[0.88rem] font-bold text-[var(--on-surface)] mb-[0.15rem] tracking-[-0.01em]">
							Legal authorization for emergency procedures.
						</strong>
						<span className="text-[0.75rem] text-[var(--on-surface-variant)] leading-[1.5]">
							Read carefully before providing your consent below.
						</span>
					</div>
				</div>

				<div className="h-px w-full bg-[var(--surface-container-low)]" />

				<p className="text-[0.78rem] text-[var(--on-surface-variant)] leading-[1.7]">
					I provide clinical consent for my provider to contact the individual
					listed above in the event of a clinical emergency. I understand that
					this information is stored securely and will only be accessed when my
					immediate safety is at risk.
				</p>

				<div
					className="flex items-start gap-3 cursor-pointer group mt-2 select-none"
					onClick={() => setAgreed(!agreed)}
				>
					<Checkbox
						id="clinical-consent"
						checked={agreed}
						onCheckedChange={(checked) => setAgreed(!!checked)}
						className="w-[18px] h-[18px] rounded-sm bg-surface-container-low border-2 border-surface-container data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white [&_svg]:stroke-[3px] [&_svg]:w-3.5 [&_svg]:h-3.5 shrink-0 mt-[0.1rem]"
					/>
					<label
						htmlFor="clinical-consent"
						className="text-[0.82rem] font-semibold text-[var(--on-surface)] leading-[1.55] cursor-pointer"
					>
						I have read and agree to the clinical consent terms above.
					</label>
				</div>
			</div>

			{/* Reassurance Strip */}
			<div className="flex items-center gap-[0.6rem] bg-[var(--surface-container-low)] rounded-[var(--r-md)] px-4 py-[0.85rem] w-full mb-10">
				<ShieldCheck
					className="text-[var(--on-surface-variant)] opacity-70 shrink-0"
					size={16}
					weight="fill"
				/>
				<p className="text-[0.73rem] text-[var(--on-surface-variant)] leading-[1.5] m-0">
					Your emergency contact&apos;s details are encrypted and never shared
					outside your care team. Access is strictly limited to verified
					clinical emergencies.
				</p>
			</div>

			{error && <p className="text-red-500 text-sm -mt-6 mb-4">{error}</p>}

			<BottomBar
				totalSteps={4}
				currentStep={4}
				nextLabel={saving ? "Saving…" : "Continue"}
				onNext={handleFinish}
				showBack={true}
				disabled={!agreed || !isEcValid || saving}
			/>
		</OnboardingLayout>
	);
}
