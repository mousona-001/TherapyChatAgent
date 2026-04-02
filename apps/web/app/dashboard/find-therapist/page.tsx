"use client";

import {
	createConnection,
	getDeepTherapistRecommendations,
	getTherapistRecommendations,
} from "@/app/onboarding/actions";
import {
	ArrowClockwise,
	MagnifyingGlass,
	Robot,
	Sparkle,
	Star,
	Warning,
} from "@phosphor-icons/react";
import { Button, Input } from "@repo/ui";
import { useCallback, useEffect, useRef, useState } from "react";

interface TherapistResult {
	therapistId: string;
	name: string;
	specializations: string | null;
	therapyMethods: string | null;
	communicationStyle: string | null;
	tone: string | null;
	rating: string | null;
	status: string | null;
	yearsOfExperience: number | null;
	score: number;
}

type AnalysisStep = "profiling" | "searching" | "ranking" | null;

const STEP_ORDER: Record<string, number> = {
	profiling: 0,
	searching: 1,
	ranking: 2,
};

const ANALYSIS_STEPS: { key: string; label: string }[] = [
	{ key: "profiling", label: "Reading your care profile…" },
	{ key: "searching", label: "Scanning therapist network…" },
	{ key: "ranking", label: "Ranking by compatibility…" },
];

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getTags(specializations: string | null): string[] {
	if (!specializations) return [];
	return specializations
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, 3);
}

export default function FindTherapistPage() {
	const [therapists, setTherapists] = useState<TherapistResult[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [requestingId, setRequestingId] = useState<string | null>(null);
	const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
	const [searchInput, setSearchInput] = useState("");
	const [analysisStep, setAnalysisStep] = useState<AnalysisStep>(null);
	const [isDeepResults, setIsDeepResults] = useState(false);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hasMountedRef = useRef(false);
	const mountedRef = useRef(true);

	useEffect(() => {
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const fetchRecommendations = useCallback(async (queryOverride?: string) => {
		setLoading(true);
		setError(null);
		setIsDeepResults(false);
		try {
			const { data, error: apiError } = await getTherapistRecommendations(
				queryOverride,
				15,
			);
			if (!mountedRef.current) return;
			if (apiError) throw new Error(apiError as string);
			setTherapists(data || []);
		} catch (e) {
			if (!mountedRef.current) return;
			setError(e instanceof Error ? e.message : "Failed to load matches");
			setTherapists([]);
		} finally {
			if (mountedRef.current) setLoading(false);
		}
	}, []);

	// Initial load + debounced search on input change
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			fetchRecommendations(undefined);
			return;
		}
		debounceRef.current = setTimeout(() => {
			fetchRecommendations(searchInput.trim() || undefined);
		}, 400);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [searchInput, fetchRecommendations]);

	const handleBeginDeepAnalysis = async () => {
		if (analysisStep !== null) return;
		setError(null);
		setIsDeepResults(false);
		// Start API call immediately; animate steps in parallel
		const apiPromise = getDeepTherapistRecommendations();
		setAnalysisStep("profiling");
		await new Promise((r) => setTimeout(r, 750));
		if (!mountedRef.current) return;
		setAnalysisStep("searching");
		await new Promise((r) => setTimeout(r, 750));
		if (!mountedRef.current) return;
		setAnalysisStep("ranking");
		try {
			const { data, error: apiError } = await apiPromise;
			if (!mountedRef.current) return;
			if (apiError) throw new Error(apiError as string);
			setTherapists(data || []);
			setIsDeepResults(true);
		} catch (e) {
			if (!mountedRef.current) return;
			setError(e instanceof Error ? e.message : "Deep analysis failed");
		} finally {
			if (mountedRef.current) setAnalysisStep(null);
		}
	};

	const handleRequestChat = async (therapistId: string) => {
		setRequestingId(therapistId);
		try {
			const { error: connError } = await createConnection(therapistId);
			if (connError && !connError.includes("Connection already exists")) {
				throw new Error(connError as string);
			}
			setRequestedIds((prev) => new Set(prev).add(therapistId));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to send request");
		} finally {
			setRequestingId(null);
		}
	};

	const isAnalysing = analysisStep !== null;

	return (
		<div className="flex flex-col h-full w-full">
			{/* Sticky Header — title + search */}
			<div className="shrink-0 pt-6 pb-5 px-8 border-b border-outline-variant bg-[rgba(249,249,255,0.96)]">
				<div className="flex items-center justify-between gap-6 flex-wrap">
					<div>
						<h1 className="text-[clamp(1.4rem,2.5vw,1.85rem)] font-extrabold tracking-[-0.02em] text-on-surface">
							Find Your Therapist
						</h1>
						<p className="text-[0.84rem] text-on-surface-variant mt-1">
							Matched to your care profile using our semantic engine.
						</p>
					</div>
					{/* Search input */}
					<div className="relative flex-1 min-w-50 max-w-110">
						<MagnifyingGlass
							className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 pointer-events-none z-10"
							size={15}
						/>
						<Input
							type="text"
							placeholder="Search by name, specialty, or concern…"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="w-full pl-9 pr-4 text-[0.83rem] bg-surface-container-low border-outline-variant rounded-sm focus-visible:ring-0 focus-visible:border-primary placeholder:text-on-surface-variant placeholder:opacity-50 h-9"
						/>
					</div>
				</div>
			</div>

			{/* Body — flex column; only the cards area scrolls */}
			<div className="flex-1 flex flex-col min-h-0 px-8 pt-5">
				{/* Section label */}
				{!isAnalysing && !loading && !error && therapists.length > 0 && (
					<div className="shrink-0 flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant mb-4">
						<Star weight="fill" className="text-[0.95rem] opacity-55" />
						{isDeepResults ? "Deep Analysis Results" : "Top matches for you"}
					</div>
				)}

				{/* ── Dynamic area ── */}
				{isAnalysing ? (
					/* Analysis overlay */
					<div className="flex-1 flex flex-col items-center justify-center gap-6 pb-6">
						<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
							<Sparkle
								weight="fill"
								size={30}
								className="text-primary animate-pulse"
							/>
						</div>
						<div className="text-center">
							<p className="text-[1.0rem] font-extrabold text-on-surface tracking-[-0.02em] mb-1">
								Analysing your profile with AI
							</p>
							<p className="text-[0.78rem] text-on-surface-variant">
								Finding your best therapist matches
							</p>
						</div>
						<div className="flex flex-col gap-3 w-full max-w-65">
							{ANALYSIS_STEPS.map(({ key, label }) => {
								const stepIdx = STEP_ORDER[key];
								const currentIdx = STEP_ORDER[analysisStep as string] ?? 0;
								const isDone = stepIdx < currentIdx;
								const isActive = stepIdx === currentIdx;
								return (
									<div key={key} className="flex items-center gap-3">
										<div
											className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[0.6rem] font-bold transition-colors ${
												isDone
													? "bg-[#2dbe7a] text-white"
													: isActive
														? "bg-primary text-white"
														: "bg-surface-container text-on-surface-variant"
											}`}
										>
											{isDone ? (
												"✓"
											) : isActive ? (
												<span className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
											) : (
												<span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 inline-block" />
											)}
										</div>
										<span
											className={`text-[0.8rem] font-semibold transition-colors ${
												isDone
													? "text-on-surface"
													: isActive
														? "text-primary"
														: "text-on-surface-variant opacity-40"
											}`}
										>
											{label}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				) : loading ? (
					/* Skeleton cards */
					<div className="flex-1 overflow-y-auto customize-scrollbar pb-6">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{[1, 2, 3, 4].map((i) => (
								<div
									key={i}
									className="bg-surface-container-lowest rounded-md p-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] flex flex-col gap-3 animate-pulse h-65"
								>
									<div className="h-3 w-16 bg-surface-container rounded-sm" />
									<div className="flex items-start gap-3.5 pt-1.5">
										<div className="w-13 h-13 rounded-md bg-surface-container shrink-0" />
										<div className="flex-1 flex flex-col gap-2 pt-1">
											<div className="h-3 w-3/4 bg-surface-container rounded-sm" />
											<div className="h-2.5 w-1/2 bg-surface-container rounded-sm" />
										</div>
									</div>
									<div className="flex gap-1.5">
										<div className="h-5 w-16 bg-surface-container rounded-sm" />
										<div className="h-5 w-20 bg-surface-container rounded-sm" />
									</div>
									<div className="h-2.5 w-full bg-surface-container rounded-sm" />
									<div className="h-2.5 w-4/5 bg-surface-container rounded-sm" />
								</div>
							))}
						</div>
					</div>
				) : error ? (
					/* Error state */
					<div className="flex-1 flex flex-col items-center justify-center gap-5 pb-6">
						<div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center shadow-[0_0_0_8px_rgba(186,26,26,0.05)]">
							<Warning weight="fill" size={28} className="text-error" />
						</div>
						<div className="text-center max-w-72">
							<p className="text-[1rem] font-extrabold text-on-surface tracking-[-0.01em] mb-2">
								Something went wrong
							</p>
							<p className="text-[0.78rem] text-on-surface-variant leading-[1.6]">
								{error}
							</p>
						</div>
						<Button
							size="sm"
							variant="outline"
							className="text-[0.75rem] rounded-sm px-5 h-8 gap-2 border-outline-variant"
							onClick={() =>
								fetchRecommendations(searchInput.trim() || undefined)
							}
						>
							<ArrowClockwise size={13} /> Try Again
						</Button>
					</div>
				) : therapists.length === 0 ? (
					/* Empty state */
					<div className="flex-1 flex flex-col items-center justify-center gap-5 pb-6">
						<div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center shadow-[0_0_0_8px_var(--color-surface-container-low)]">
							<MagnifyingGlass
								size={28}
								className="text-on-surface-variant opacity-50"
							/>
						</div>
						<div className="text-center max-w-72">
							<p className="text-[1rem] font-extrabold text-on-surface tracking-[-0.01em] mb-2">
								No matches found yet
							</p>
							<p className="text-[0.78rem] text-on-surface-variant leading-[1.6]">
								{searchInput.trim()
									? `No therapists matched "${searchInput.trim()}". Try a different search or use Deep Analysis below.`
									: "The more complete your profile is, the better we can match you. Try Deep Analysis to cast a wider net."}
							</p>
						</div>
						<Button
							className="font-manrope text-[0.78rem] font-bold text-white bg-primary hover:bg-primary/90 hover:-translate-y-px transition-all rounded-sm px-5 h-9 flex items-center gap-2 shadow-[0_4px_16px_-4px_rgba(73,75,214,0.35)]"
							onClick={handleBeginDeepAnalysis}
							disabled={isAnalysing || isDeepResults}
						>
							<Sparkle weight="fill" />{" "}
							{isDeepResults ? "Analysis Complete" : "Begin Deep Analysis"}
						</Button>
					</div>
				) : (
					/* Therapist cards — the ONLY scrolling section */
					<div className="flex-1 overflow-y-auto customize-scrollbar pb-6">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{therapists.map((t) => {
								const initials = getInitials(t.name);
								const match = Math.round(t.score * 100);
								const isOnline = t.status === "online";
								const rating = parseFloat(t.rating ?? "5").toFixed(1);
								const tags = getTags(t.specializations);
								const bio = t.specializations || t.therapyMethods || "";
								const role = t.yearsOfExperience
									? `${t.yearsOfExperience} YRS EXPERIENCE`
									: (t.communicationStyle?.toUpperCase() ?? "THERAPIST");

								return (
									<div
										key={t.therapistId}
										className="bg-surface-container-lowest rounded-md p-5 pb-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] flex flex-col gap-3 relative cursor-pointer transition-all duration-200 hover:shadow-[0_4px_20px_-4px_rgba(0,50,101,0.13)] hover:-translate-y-px"
									>
										{/* Match Badge */}
										<div className="absolute top-0 right-4 text-[0.58rem] font-extrabold tracking-[0.08em] uppercase bg-primary text-white px-2.5 py-1 rounded-b-sm">
											{match}% Match
										</div>

										{/* Card Top */}
										<div className="flex items-start gap-3.5 pt-1.5">
											<div className="relative shrink-0">
												<div className="w-13 h-13 rounded-md bg-primary-container flex items-center justify-center text-[0.95rem] font-extrabold text-primary tracking-[-0.01em]">
													{initials}
												</div>
												{isOnline && (
													<span className="w-2.25 h-2.25 rounded-full bg-[#2dbe7a] border-2 border-white absolute -bottom-0.5 -right-0.5" />
												)}
											</div>
											<div className="flex-1 min-w-0 pt-0.5">
												<h3 className="text-[0.95rem] font-extrabold text-on-surface tracking-[-0.01em] leading-[1.2] mb-1">
													{t.name}
												</h3>
												<div className="flex items-center gap-1 text-[0.73rem] font-semibold text-on-surface-variant mb-1.5">
													<Star weight="fill" className="text-[#f5a623]" />{" "}
													{rating}
												</div>
												<div className="text-[0.58rem] font-extrabold uppercase tracking-widest text-primary">
													{role}
												</div>
											</div>
										</div>

										{/* Tags */}
										{tags.length > 0 && (
											<div className="flex flex-wrap gap-1.5 mt-1">
												{tags.map((tag) => (
													<span
														key={tag}
														className="text-[0.67rem] font-semibold px-2.5 py-1 rounded-sm bg-surface-container-low text-on-surface-variant"
													>
														{tag}
													</span>
												))}
											</div>
										)}

										{/* Bio */}
										{bio && (
											<p className="text-[0.78rem] text-on-surface-variant leading-[1.6] line-clamp-2 overflow-hidden mt-1">
												{bio}
											</p>
										)}

										{/* Footer */}
										<div className="flex items-center justify-end pt-3 mt-auto border-t border-surface-container">
											<Button
												className="font-manrope text-[0.73rem] font-bold text-white bg-on-surface hover:bg-on-surface/80 rounded-sm px-4 py-1.5 h-auto disabled:opacity-60"
												onClick={() => handleRequestChat(t.therapistId)}
												disabled={
													requestingId !== null ||
													requestedIds.has(t.therapistId)
												}
											>
												{requestingId === t.therapistId
													? "Sending…"
													: requestedIds.has(t.therapistId)
														? "Request Sent ✓"
														: "Request for Chat"}
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* AI Card — fixed at bottom, only for results */}
				{!isAnalysing && !loading && !error && therapists.length > 0 && (
					<div className="shrink-0 pb-6 pt-2">
						<div className="bg-primary-container rounded-md p-6 flex flex-col md:flex-row items-center gap-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)]">
							<div className="flex-1">
								<div className="flex items-center gap-1.5 text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-primary mb-2">
									<Robot weight="fill" className="text-[0.7rem]" /> Deep
									Discovery AI
								</div>
								<h3 className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-on-surface leading-[1.2] mb-1.5">
									Can&apos;t find the perfect match?
								</h3>
								<p className="text-[0.78rem] text-on-surface-variant leading-[1.6] mb-3.5 max-w-lg">
									Let our AI analyse your intake patterns to recommend
									specialised practitioners from our global network.
								</p>
								<Button
									className="font-manrope text-[0.78rem] font-bold text-white bg-primary hover:bg-primary/90 hover:-translate-y-px transition-all rounded-sm px-5 py-5 h-auto flex items-center gap-2 shadow-[0_4px_16px_-4px_rgba(73,75,214,0.35)]"
									onClick={handleBeginDeepAnalysis}
									disabled={isAnalysing || isDeepResults}
								>
									<Sparkle weight="fill" />{" "}
									{isDeepResults ? "Analysis Complete" : "Begin Deep Analysis"}
								</Button>
							</div>
							<div className="shrink-0 w-22.5 h-22.5 rounded-md bg-surface-container-lowest flex items-center justify-center">
								<div className="w-12.5 h-12.5 rounded-full bg-primary flex items-center justify-center text-white text-[1.35rem] shadow-[0_0_0_9px_var(--color-primary-container)]">
									<Sparkle weight="fill" />
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
