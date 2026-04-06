"use client";
import { useEffect, useRef, useState } from "react";

import { BottomBar } from "@/features/onboarding/components/BottomBar";
import {
	FormCard,
	FormGroup,
	FormLabel,
	FormRow2,
} from "@/features/onboarding/components/FormCard";
import { LanguageSelect } from "@/features/onboarding/components/LanguageSelect";
import { OnboardingLayout } from "@/features/onboarding/components/OnboardingLayout";
import { PhoneVerification } from "@/features/onboarding/components/PhoneVerification";
import { TrustBadge } from "@/features/onboarding/components/TrustBadge";
import { useOnboardingRedirect } from "@/features/onboarding/hooks/useOnboardingRedirect";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
	CaretDown,
	DeviceMobile,
	Info,
	Translate,
	User,
} from "@phosphor-icons/react";
import {
	Button,
	Combobox,
	DatePicker,
	Input,
	isValidPhoneNumber,
	Textarea,
} from "@repo/ui";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
	getProfile,
	resetPhoneVerification,
	saveTherapistProfile,
} from "../../actions";

// ── Zod schema ──────────────────────────────────────────────────────────────
const schema = z.object({
	firstName: z.string().min(1, "Required"),
	lastName: z.string().min(1, "Required"),
	dateOfBirth: z.date({ required_error: "Required" }),
	gender: z.string().min(1, "Required"),
	bio: z.string().optional(),
	phoneNumber: z.string().refine((val) => !val || isValidPhoneNumber(val), {
		message: "Invalid phone number",
	}),
	languages: z.array(z.string()).min(1, "Select at least one language"),
});
type FormErrors = Partial<Record<keyof z.infer<typeof schema>, string>>;

const GENDER_OPTIONS = [
	{ value: "Man", label: "Man" },
	{ value: "Woman", label: "Woman" },
	{ value: "Non-binary", label: "Non-binary" },
	{ value: "Prefer not to say", label: "Prefer not to say" },
	{ value: "Another identity", label: "Another identity" },
];

export default function TherapistStep2() {
	const router = useRouter();
	const { loading } = useOnboardingRedirect();
	const [firstName, setFirstName] = useLocalStorage("therapist_firstName", "");
	const [lastName, setLastName] = useLocalStorage("therapist_lastName", "");
	const [dateOfBirth, setDateOfBirth] = useLocalStorage<Date>(
		"therapist_dateOfBirth",
		new Date(),
	);
	const [gender, setGender] = useLocalStorage("therapist_gender", "");
	const [bio, setBio] = useLocalStorage("therapist_bio", "");
	const [phoneNumber, setPhoneNumber] = useLocalStorage(
		"therapist_phoneNumber",
		"",
	);
	const [languages, setLanguages] = useLocalStorage<string[]>(
		"therapist_languages",
		["English"],
	);
	const [isVerified, setIsVerified] = useLocalStorage(
		"therapist_isVerified",
		false,
	);
	const [originalPhone, setOriginalPhone] = useState("");
	const [showReverifyWarning, setShowReverifyWarning] = useState(false);
	const [errors, setErrors] = useState<FormErrors>({});
	const [saving, setSaving] = useState(false);
	const [apiError, setApiError] = useState("");

	// Sync with server on mount
	useEffect(() => {
		async function sync() {
			const { data, error } = await getProfile("therapist");
			if (data) {
				setFirstName(data.firstName || "");
				setLastName(data.lastName || "");
				if (data.dateOfBirth) setDateOfBirth(new Date(data.dateOfBirth));
				setGender(data.gender || "");
				setBio(data.bio || "");
				setPhoneNumber(data.phoneNumber || "");
				setOriginalPhone(data.phoneNumber || "");
				setLanguages(data.languages || ["English"]);

				if (data.isPhoneVerified) {
					setIsVerified(true);
				}
			}
		}
		sync();
	}, []);

	// Detect phone changes
	useEffect(() => {
		if (originalPhone && phoneNumber !== originalPhone) {
			if (isVerified) {
				setIsVerified(false);
				setShowReverifyWarning(true);
				resetPhoneVerification(); // Reset on server
			}
		} else if (phoneNumber === originalPhone && originalPhone !== "") {
			setIsVerified(true);
			setShowReverifyWarning(false);
		}
	}, [phoneNumber, originalPhone, isVerified]);

	// Viewport scroll hint (for sections that might be off-screen)
	const footerSectionRef = useRef<HTMLDivElement>(null);
	const [showScrollHint, setShowScrollHint] = useState(false);

	useEffect(() => {
		const el = footerSectionRef.current;
		if (!el) return;
		const timer = setTimeout(() => {
			const observer = new IntersectionObserver(
				([entry]) => setShowScrollHint(!entry.isIntersecting),
				{ threshold: 0.1, rootMargin: "0px 0px -80px 0px" },
			);
			observer.observe(el);
			return () => observer.disconnect();
		}, 300);
		return () => clearTimeout(timer);
	}, []);

	if (loading) return null;

	// Computed validity
	const isValid = !!(
		firstName.trim() &&
		lastName.trim() &&
		gender &&
		dateOfBirth &&
		phoneNumber &&
		isVerified &&
		languages.length > 0
	);

	const validate = () => {
		const result = schema.safeParse({
			firstName,
			lastName,
			dateOfBirth,
			gender,
			bio,
			phoneNumber,
			languages,
		});
		if (!result.success) {
			const fe: FormErrors = {};
			result.error.errors.forEach((e) => {
				const key = e.path[0] as keyof FormErrors;
				if (!fe[key]) fe[key] = e.message;
			});
			setErrors(fe);
			return false;
		}
		setErrors({});
		return true;
	};

	const handleNext = async () => {
		if (!validate()) return;
		setSaving(true);
		setApiError("");

		try {
			const result = await saveTherapistProfile({
				firstName,
				lastName,
				dateOfBirth,
				gender,
				bio,
				phoneNumber,
				languages,
			});

			if (result.error) {
				if (typeof result.error === "object") {
					setErrors(result.error as any);
				} else {
					setApiError(result.error);
				}
				setSaving(false);
				return;
			}

			router.push("/onboarding/therapist/step-3");
		} catch (e) {
			setApiError("An unexpected error occurred. Please try again.");
			setSaving(false);
		}
	};

	const scrollToBottom = () => {
		footerSectionRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	};

	return (
		<OnboardingLayout>
			<p className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem]">
				Step 2 of 4 &bull; Identity
			</p>

			<h1 className="text-[clamp(2rem,5vw,2.75rem)] font-extrabold tracking-[-0.02em] text-[var(--on-surface)] text-center w-full leading-[1.15] mb-[1rem]">
				Tell us about
				<br />
				yourself.
			</h1>

			<p className="text-[0.95rem] font-normal text-[var(--on-surface-variant)] text-center leading-[1.65] max-w-[440px] mb-[3rem]">
				This forms your provider profile. Patients and your care team will use
				this to understand who you are and how best to work with you.
			</p>

			{/* Personal Information */}
			<div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] w-full">
				<User weight="bold" size={16} className="opacity-55" />
				Personal information
			</div>

			<FormCard>
				<FormRow2>
					<FormGroup>
						<FormLabel>
							First name <span className="text-red-500">*</span>
						</FormLabel>
						<Input
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							placeholder="e.g. John"
							className="bg-(--surface-container-low) border-0 border-b-2 border-b-transparent rounded-(--r-sm) px-[0.85rem] py-[0.7rem] h-auto text-[0.9rem] text-(--on-surface) placeholder:text-(--on-surface-variant) placeholder:opacity-55 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b-(--primary) focus-visible:bg-(--surface-container-lowest) focus-visible:shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] transition-[background,border-color] duration-180"
						/>
						{errors.firstName && (
							<p className="text-red-500 text-[0.7rem] mt-1">
								{errors.firstName}
							</p>
						)}
					</FormGroup>
					<FormGroup>
						<FormLabel>
							Last name <span className="text-red-500">*</span>
						</FormLabel>
						<Input
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							placeholder="e.g. Doe"
							className="bg-(--surface-container-low) border-0 border-b-2 border-b-transparent rounded-(--r-sm) px-[0.85rem] py-[0.7rem] h-auto text-[0.9rem] text-(--on-surface) placeholder:text-(--on-surface-variant) placeholder:opacity-55 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b-(--primary) focus-visible:bg-(--surface-container-lowest) focus-visible:shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] transition-[background,border-color] duration-180"
						/>
						{errors.lastName && (
							<p className="text-red-500 text-[0.7rem] mt-1">
								{errors.lastName}
							</p>
						)}
					</FormGroup>
				</FormRow2>

				<FormRow2>
					<FormGroup>
						<FormLabel>
							Date of birth <span className="text-red-500">*</span>
						</FormLabel>
						<DatePicker
							value={dateOfBirth}
							onChange={(d: Date | undefined) => d && setDateOfBirth(d)}
						/>
						{errors.dateOfBirth && (
							<p className="text-red-500 text-[0.7rem] mt-1">
								{errors.dateOfBirth}
							</p>
						)}
					</FormGroup>
					<FormGroup>
						<FormLabel>
							Gender identity <span className="text-red-500">*</span>
						</FormLabel>
						<Combobox
							options={GENDER_OPTIONS}
							value={gender}
							onChange={setGender}
							placeholder="Select identity"
						/>
						{errors.gender && (
							<p className="text-red-500 text-[0.7rem] mt-1">{errors.gender}</p>
						)}
					</FormGroup>
				</FormRow2>

				<FormGroup>
					<FormLabel>Short bio</FormLabel>
					<Textarea
						rows={3}
						value={bio}
						onChange={(e) => setBio(e.target.value)}
						placeholder="Tell patients a little about your background, approach, and what drives your practice…"
						className="resize-none leading-[1.6]"
					/>
				</FormGroup>
			</FormCard>

			{/* Phone verification */}
			<div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] mt-6 w-full">
				<DeviceMobile weight="bold" size={16} className="opacity-55" />
				Phone verification <span className="text-red-500 ml-0.5">*</span>
			</div>

			<FormCard>
				<PhoneVerification
					initialPhoneNumber={phoneNumber}
					initialIsVerified={isVerified}
					onVerified={(phone, verified) => {
						setPhoneNumber(phone);
						setIsVerified(verified);
						if (verified) {
							setOriginalPhone(phone);
							setShowReverifyWarning(false);
						}
					}}
				/>
				{showReverifyWarning && (
					<div className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-md">
						<Info size={16} weight="fill" className="text-amber-600" />
						<p className="text-[0.72rem] font-medium text-amber-700 leading-tight">
							Changing your phone number requires re-verification for security.
						</p>
					</div>
				)}
				{errors.phoneNumber && (
					<p className="text-red-500 text-[0.7rem] mt-2">
						{errors.phoneNumber}
					</p>
				)}
			</FormCard>

			{/* Languages */}
			<div className="flex items-center justify-center gap-[0.5rem] text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)] mb-[1.25rem] mt-6 w-full">
				<Translate weight="bold" size={16} className="opacity-55" />
				Languages spoken <span className="text-red-500 ml-0.5">*</span>
			</div>

			<FormCard>
				<FormGroup>
					<FormLabel>Select all that apply</FormLabel>
					<LanguageSelect selected={languages} onChange={setLanguages} />
					{errors.languages && (
						<p className="text-red-500 text-[0.7rem] mt-1">
							{errors.languages}
						</p>
					)}
				</FormGroup>
			</FormCard>

			<div ref={footerSectionRef} className="h-4" />

			{apiError && (
				<div className="w-full bg-red-50 border border-red-200 rounded-[var(--r-md)] p-4 mt-4 animate-in fade-in slide-in-from-top-1">
					<p className="text-red-600 text-[0.85rem] font-medium leading-[1.5]">
						{apiError}
					</p>
				</div>
			)}

			<TrustBadge
				icon="lock"
				title="End-to-end data protection"
				description="Your personal information is encrypted in transit and at rest. We comply with HIPAA and never share your data with third parties without your explicit consent."
			/>

			{showScrollHint && (
				<Button
					type="button"
					onClick={scrollToBottom}
					className="fixed bottom-[88px] right-6 z-30 flex items-center gap-1.5 px-3.5 h-auto py-2 bg-[var(--primary)] text-[var(--on-primary)] text-[0.72rem] font-bold rounded-full border-none shadow-[0_4px_20px_-4px_rgba(73,75,214,0.45)] cursor-pointer animate-bounce"
				>
					More sections below
					<CaretDown weight="bold" size={12} />
				</Button>
			)}

			<BottomBar
				totalSteps={4}
				currentStep={2}
				nextLabel={saving ? "Saving…" : "Continue"}
				onNext={handleNext}
				showBack={true}
				disabled={!isValid || saving}
			/>
		</OnboardingLayout>
	);
}
