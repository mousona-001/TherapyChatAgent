"use client";

import {
	createConnection,
	getConnections,
	getDeepTherapistRecommendations,
	getTherapistRecommendations,
	searchTherapists,
} from "@/app/onboarding/actions";
import { DashboardPageHeader } from "@/features/dashboard/components/DashboardPageHeader";
import { usePresence } from "@/hooks/usePresence";
import {
	ArrowClockwise,
	CalendarBlank,
	ChatCircle,
	MagnifyingGlass,
	Robot,
	Sparkle,
	Star,
	Warning,
} from "@phosphor-icons/react";
import { Button, Input } from "@repo/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Connection {
	id: string;
	status: string;
	therapistId: string;
	therapistName: string;
	therapistStatus: string;
	therapistRating: string;
	sessionId: string | null;
	nextSession: string | null;
}

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
	therapistType: string | null;
	reviewCount: number | null;
	bio: string | null;
	score: number;
}

type AnalysisStep = "profiling" | "searching" | "ranking" | null;

const SEARCH_PAGE_SIZE = 8;

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

function formatNextSession(date: string | null | undefined): string | null {
	if (!date) return null;
	const d = new Date(date);
	if (isNaN(d.getTime())) return null;
	return (
		d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
		" · " +
		d.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		})
	);
}

export default function FindTherapistPage() {
	const [therapists, setTherapists] = useState<TherapistResult[]>([]);
	const [connections, setConnections] = useState<Connection[]>([]);
	const [mounted, setMounted] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [requestingId, setRequestingId] = useState<string | null>(null);
	const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
	const [searchInput, setSearchInput] = useState("");
	const [analysisStep, setAnalysisStep] = useState<AnalysisStep>(null);
	const [isDeepResults, setIsDeepResults] = useState(false);
	const [isAiCardExpanded, setIsAiCardExpanded] = useState(false);

	// Separate state for search vs recommendations
	const [searchResults, setSearchResults] = useState<TherapistResult[] | null>(
		null,
	);
	const [searchTotal, setSearchTotal] = useState(0);
	const [searchPage, setSearchPage] = useState(1);
	const [searchLoading, setSearchLoading] = useState(false);
	const [searchLoadingMore, setSearchLoadingMore] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hasMountedRef = useRef(false);
	const mountedRef = useRef(true);

	// Collect all currently-visible therapist IDs for presence tracking
	const allTherapistIds = useMemo(() => {
		const ids = new Set<string>();
		therapists.forEach((t) => ids.add(t.therapistId));
		if (searchResults) searchResults.forEach((t) => ids.add(t.therapistId));
		connections.forEach((c) => ids.add(c.therapistId));
		return Array.from(ids);
	}, [therapists, searchResults, connections]);

	const presenceMap = usePresence(allTherapistIds);

	useEffect(() => {
		return () => {
			mountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		setMounted(true);
	}, []);

	const fetchRecommendations = useCallback(
		async (queryOverride?: string, bustCache = false) => {
			setLoading(true);
			setError(null);
			setIsDeepResults(false);

			// Serve from sessionStorage cache on repeat visits (unless forced refresh)
			const cacheKey = "find-therapist:recommendations";
			if (!bustCache && !queryOverride) {
				try {
					const cached = sessionStorage.getItem(cacheKey);
					if (cached) {
						const { data, ts } = JSON.parse(cached);
						// Cache valid for 5 minutes
						if (Date.now() - ts < 5 * 60 * 1000) {
							setTherapists(data);
							setLoading(false);
							return;
						}
					}
				} catch {}
			}

			try {
				const { data, error: apiError } = await getTherapistRecommendations(
					queryOverride,
					15,
				);
				if (apiError) throw new Error(apiError as string);
				setTherapists(data || []);
				if (!queryOverride) {
					try {
						sessionStorage.setItem(
							cacheKey,
							JSON.stringify({ data: data || [], ts: Date.now() }),
						);
					} catch {}
				}
			} catch (e) {
				setError(e instanceof Error ? e.message : "Failed to load matches");
				setTherapists([]);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	// Initial load — recommendations + connections
	useEffect(() => {
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			fetchRecommendations(undefined);

			// Cache connections in sessionStorage too
			const connCacheKey = "find-therapist:connections";
			try {
				const cached = sessionStorage.getItem(connCacheKey);
				if (cached) {
					const { data, ts } = JSON.parse(cached);
					if (Date.now() - ts < 2 * 60 * 1000) {
						setConnections(data);
						return;
					}
				}
			} catch {}

			getConnections("patient")
				.then((result) => {
					if (result.success && result.data) {
						setConnections(result.data as Connection[]);
						try {
							sessionStorage.setItem(
								connCacheKey,
								JSON.stringify({ data: result.data, ts: Date.now() }),
							);
						} catch {}
					}
				})
				.catch(() => {});
		}
	}, [fetchRecommendations]);

	// Debounced search — fires when user types; clears on empty input
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		const q = searchInput.trim();
		if (!q) {
			setSearchResults(null);
			setSearchError(null);
			setSearchLoading(false);
			return;
		}
		// Show loading skeleton immediately — don't wait for debounce
		setSearchLoading(true);
		setSearchError(null);
		setSearchPage(1);
		setSearchTotal(0);
		setSearchLoadingMore(false);
		debounceRef.current = setTimeout(async () => {
			try {
				const { data, error: apiError } = await searchTherapists(
					q,
					1,
					SEARCH_PAGE_SIZE,
				);
				if (apiError) throw new Error(apiError as string);
				setSearchResults((data as any)?.results || []);
				setSearchTotal((data as any)?.total ?? 0);
				setSearchPage(1);
			} catch (e) {
				setSearchError(e instanceof Error ? e.message : "Search failed");
				setSearchResults(null);
			} finally {
				setSearchLoading(false);
			}
		}, 350);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [searchInput]);

	const handleLoadMoreSearch = async () => {
		const q = searchInput.trim();
		if (!q || searchLoadingMore) return;
		const nextPage = searchPage + 1;
		setSearchLoadingMore(true);
		try {
			const { data, error: apiError } = await searchTherapists(
				q,
				nextPage,
				SEARCH_PAGE_SIZE,
			);
			if (apiError) throw new Error(apiError as string);
			setSearchResults((prev) => [
				...(prev ?? []),
				...((data as any)?.results || []),
			]);
			setSearchTotal((data as any)?.total ?? searchTotal);
			setSearchPage(nextPage);
		} catch (e) {
			setSearchError(e instanceof Error ? e.message : "Search failed");
		} finally {
			setSearchLoadingMore(false);
		}
	};

	const handleBeginDeepAnalysis = async () => {
		if (analysisStep !== null) return;
		setError(null);
		setIsDeepResults(false);
		// Start API call immediately; animate steps in parallel
		const apiPromise = getDeepTherapistRecommendations();
		setAnalysisStep("profiling");
		await new Promise((r) => setTimeout(r, 750));
		setAnalysisStep("searching");
		await new Promise((r) => setTimeout(r, 750));
		setAnalysisStep("ranking");
		try {
			const { data, error: apiError } = await apiPromise;
			if (apiError) throw new Error(apiError as string);
			setTherapists(data || []);
			setIsDeepResults(true);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Deep analysis failed");
		} finally {
			setAnalysisStep(null);
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
	const isSearchMode = searchInput.trim().length > 0;
	const acceptedConnections = connections.filter(
		(c) => c.status === "accepted",
	);

	return (
		<div className="flex flex-col h-full w-full">
			<DashboardPageHeader
				title="Find Your Therapist"
				description="Matched to your care profile using our semantic engine."
			>
				<div className="relative flex-1 min-w-96 max-w-2xl">
					<MagnifyingGlass
						className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 pointer-events-none z-10"
						size={16}
					/>
					<Input
						type="text"
						placeholder="Search by name, specialty, or concern…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="w-full pl-10 pr-4 text-[0.84rem] bg-surface-container-low border-outline-variant rounded-sm focus-visible:ring-0 focus-visible:border-primary placeholder:text-on-surface-variant placeholder:opacity-50 h-11"
					/>
				</div>
			</DashboardPageHeader>

			{/* Body — flex column; only the cards area scrolls */}
			<div className="flex-1 flex flex-col min-h-0 px-8 pt-5">
				{!mounted ? (
					/* SSR / pre-hydration: render a stable skeleton so server and client HTML match */
					<div className="flex-1 overflow-y-auto pb-6">
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
				) : (
					<>
						{/* Your Therapists (accepted connections) */}
						{acceptedConnections.length > 0 && (
							<div className="shrink-0 mb-6">
								<div className="shrink-0 flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant mb-4">
									<CalendarBlank weight="fill" className="opacity-55" />
									Your Therapists
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
									{acceptedConnections.map((conn) => {
										const connInitials = getInitials(conn.therapistName);
										const nextLabel = formatNextSession(conn.nextSession);
										const chatHref = `/sessions?connection=${conn.id}`;
										const rating = parseFloat(
											conn.therapistRating ?? "5",
										).toFixed(1);
										return (
											<div
												key={conn.id}
												className="bg-surface-container-lowest rounded-md p-5 pb-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] flex flex-col gap-3 relative"
											>
												{/* Connected badge */}
												<div className="absolute top-0 right-4 text-[0.58rem] font-extrabold tracking-[0.08em] uppercase bg-[#2dbe7a] text-white px-2.5 py-1 rounded-b-sm">
													Connected ✓
												</div>

												{/* Card Top */}
												<div className="flex items-start gap-3.5 pt-1.5">
													<div className="w-13 h-13 rounded-md bg-primary-container flex items-center justify-center text-[0.95rem] font-extrabold text-primary tracking-[-0.01em] shrink-0 relative">
														{connInitials}
														{(conn.therapistId in presenceMap
															? presenceMap[conn.therapistId] === "online"
															: conn.therapistStatus === "online") && (
															<span className="w-2.25 h-2.25 rounded-full bg-[#2dbe7a] border-2 border-white absolute -bottom-0.5 -right-0.5" />
														)}
													</div>
													<div className="flex-1 min-w-0 pt-0.5">
														<h3 className="text-[0.95rem] font-extrabold text-on-surface tracking-[-0.01em] leading-[1.2] mb-1">
															{conn.therapistName}
														</h3>
														<div className="flex items-center gap-1 text-[0.73rem] font-semibold text-on-surface-variant">
															<Star weight="fill" className="text-[#f5a623]" />{" "}
															{rating}
														</div>
													</div>
												</div>

												{/* Next Session chip */}
												<div
													className={`flex items-center gap-2 px-3 py-2 rounded-sm text-[0.73rem] font-semibold ${nextLabel ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant opacity-60"}`}
												>
													<CalendarBlank
														weight="bold"
														size={14}
														className="shrink-0"
													/>
													{nextLabel ? (
														<span>
															Next:{" "}
															<span className="font-extrabold">
																{nextLabel}
															</span>
														</span>
													) : (
														<span>No session scheduled</span>
													)}
												</div>

												{/* Footer */}
												<div className="flex items-center justify-end pt-3 mt-auto border-t border-surface-container">
													<Link href={chatHref}>
														<Button className="font-manrope text-[0.73rem] font-bold text-white bg-primary hover:bg-primary/90 rounded-sm px-4 py-1.5 h-auto gap-1.5">
															<ChatCircle size={13} weight="fill" /> Go to Chat
														</Button>
													</Link>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
						{/* ── SEARCH MODE vs RECOMMENDATION MODE ── */}
						{isSearchMode
							? null
							: /* Section label — only for recommendations */
								!isAnalysing &&
								!loading &&
								!error &&
								therapists.length > 0 && (
									<div className="shrink-0 flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant mb-4">
										<Star weight="fill" className="text-[0.95rem] opacity-55" />
										{isDeepResults
											? "Deep Analysis Results"
											: "Top matches for you"}
									</div>
								)}

						{/* ── SEARCH RESULTS ── */}
						{isSearchMode ? (
							<div className="flex-1 flex flex-col min-h-0">
								{!searchLoading &&
									!searchError &&
									searchResults &&
									searchResults.length > 0 && (
										<div className="shrink-0 flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant mb-4">
											<MagnifyingGlass weight="bold" className="opacity-55" />
											Showing {searchResults.length} of {searchTotal} result
											{searchTotal !== 1 ? "s" : ""} for &ldquo;
											{searchInput.trim()}&rdquo;
										</div>
									)}
								{searchLoading ? (
									<div className="flex-1 overflow-y-auto customize-scrollbar pb-6">
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
											{[1, 2, 3].map((i) => (
												<div
													key={i}
													className="bg-surface-container-lowest rounded-md p-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] flex flex-col gap-3 animate-pulse h-65"
												>
													<div className="flex items-start gap-3.5 pt-1.5">
														<div className="w-13 h-13 rounded-md bg-surface-container shrink-0" />
														<div className="flex-1 flex flex-col gap-2 pt-1">
															<div className="h-3 w-3/4 bg-surface-container rounded-sm" />
															<div className="h-2.5 w-1/2 bg-surface-container rounded-sm" />
														</div>
													</div>
													<div className="h-2.5 w-full bg-surface-container rounded-sm" />
													<div className="h-2.5 w-4/5 bg-surface-container rounded-sm" />
												</div>
											))}
										</div>
									</div>
								) : searchError ? (
									<div className="flex-1 flex flex-col items-center justify-center gap-4 pb-6">
										<div className="w-14 h-14 rounded-full bg-error/8 flex items-center justify-center">
											<MagnifyingGlass
												size={24}
												className="text-error opacity-70"
											/>
										</div>
										<div className="text-center max-w-64">
											<p className="text-[0.95rem] font-extrabold text-on-surface tracking-[-0.01em] mb-1.5">
												Search unavailable
											</p>
											<p className="text-[0.76rem] text-on-surface-variant leading-[1.6]">
												{searchError}
											</p>
										</div>
										<Button
											size="sm"
											variant="outline"
											className="text-[0.75rem] rounded-sm px-5 h-8 gap-2 border-outline-variant"
											onClick={() => setSearchInput("")}
										>
											Clear search
										</Button>
									</div>
								) : searchResults && searchResults.length === 0 ? (
									<div className="flex-1 flex flex-col items-center justify-center gap-4 pb-6">
										<div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
											<MagnifyingGlass
												size={24}
												className="text-on-surface-variant opacity-40"
											/>
										</div>
										<div className="text-center max-w-64">
											<p className="text-[0.95rem] font-extrabold text-on-surface tracking-[-0.01em] mb-1.5">
												No therapists found
											</p>
											<p className="text-[0.76rem] text-on-surface-variant leading-[1.6]">
												No results for &ldquo;
												<strong>{searchInput.trim()}</strong>&rdquo;. Try a
												different name, specialty, or concern.
											</p>
										</div>
										<Button
											size="sm"
											variant="outline"
											className="text-[0.75rem] rounded-sm px-5 h-8 border-outline-variant"
											onClick={() => setSearchInput("")}
										>
											Clear search
										</Button>
									</div>
								) : searchResults ? (
									<div className="flex-1 overflow-y-auto customize-scrollbar pb-6">
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
											{(() => {
												const connectionMap = new Map(
													connections.map((c) => [c.therapistId, c]),
												);
												return searchResults.map((t) => {
													const initials = getInitials(t.name);
													const isOnline =
														t.therapistId in presenceMap
															? presenceMap[t.therapistId] === "online"
															: t.status === "online";
													const rating = parseFloat(t.rating ?? "5").toFixed(1);
													const tags = getTags(t.specializations);
													const bio =
														t.bio ||
														t.therapyMethods ||
														t.communicationStyle ||
														"";
													const roleLabel =
														t.therapistType ??
														t.communicationStyle?.toUpperCase() ??
														"THERAPIST";
													const conn = connectionMap.get(t.therapistId);
													const nextSlot = conn?.nextSession
														? formatNextSession(conn.nextSession)
														: null;
													return (
														<div
															key={t.therapistId}
															className="bg-surface-container-lowest rounded-md p-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] flex flex-col gap-3 relative cursor-pointer transition-all duration-200 hover:shadow-[0_4px_20px_-4px_rgba(0,50,101,0.13)] hover:-translate-y-px"
														>
															<div className="flex items-start gap-3.5">
																<div className="relative shrink-0">
																	<div className="w-13 h-13 rounded-md bg-primary-container flex items-center justify-center text-[0.95rem] font-extrabold text-primary tracking-[-0.01em]">
																		{initials}
																	</div>
																	{isOnline && (
																		<span className="w-2.25 h-2.25 rounded-full bg-[#2dbe7a] border-2 border-white absolute -bottom-0.5 -right-0.5" />
																	)}
																</div>
																<div className="flex-1 min-w-0 pt-0.5">
																	<div className="text-[0.95rem] font-extrabold text-on-surface tracking-[-0.01em] leading-[1.2] mb-1">
																		{t.name}
																	</div>
																	<div className="flex items-center gap-1 text-[0.73rem] font-semibold text-on-surface-variant mb-1.5">
																		<Star
																			weight="fill"
																			className="text-[#f5a623]"
																		/>{" "}
																		{rating}
																		{t.reviewCount ? (
																			<span className="opacity-55">
																				{" "}
																				({t.reviewCount} reviews)
																			</span>
																		) : null}
																	</div>
																	<div className="flex items-center gap-1.5 flex-wrap">
																		<span className="text-[0.58rem] font-extrabold uppercase tracking-widest text-primary">
																			{roleLabel}
																		</span>
																		<span
																			className={`inline-flex items-center gap-0.5 text-[0.58rem] font-bold px-1.5 py-0.5 rounded-full ${isOnline ? "bg-emerald-50 text-emerald-700" : "bg-surface-container text-on-surface-variant/70"}`}
																		>
																			<span
																				className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
																			/>
																			{isOnline ? "Online" : "Offline"}
																		</span>
																	</div>
																</div>
															</div>
															{tags.length > 0 && (
																<div className="flex flex-wrap gap-1.5">
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
															{bio && (
																<p className="text-[0.78rem] text-on-surface-variant leading-[1.6] line-clamp-2">
																	{bio}
																</p>
															)}
															<div className="flex items-center justify-between pt-3 mt-auto border-t border-surface-container">
																<span className="text-[0.73rem] text-on-surface-variant font-medium">
																	{nextSlot && (
																		<>
																			Next:{" "}
																			<strong className="text-primary font-bold">
																				{nextSlot}
																			</strong>
																		</>
																	)}
																</span>
																<Button
																	className="font-manrope text-[0.73rem] font-bold text-white bg-on-surface hover:opacity-80 rounded-sm px-4 py-1.5 h-auto disabled:opacity-60"
																	onClick={() =>
																		handleRequestChat(t.therapistId)
																	}
																	disabled={
																		requestingId === t.therapistId ||
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
												});
											})()}
										</div>
										{searchResults.length < searchTotal && (
											<div className="flex justify-center pt-5 pb-2">
												<Button
													variant="outline"
													size="sm"
													onClick={handleLoadMoreSearch}
													disabled={searchLoadingMore}
													className="text-[0.75rem] rounded-sm px-6 h-9 gap-2 border-outline-variant font-semibold"
												>
													{searchLoadingMore
														? "Loading…"
														: `Show more (${searchTotal - searchResults.length} remaining)`}
												</Button>
											</div>
										)}
									</div>
								) : null}
							</div>
						) : (
							<>
								{/* ── Dynamic area (recommendations) ── */}
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
												const currentIdx =
													STEP_ORDER[analysisStep as string] ?? 0;
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
												fetchRecommendations(
													searchInput.trim() || undefined,
													true,
												)
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
											{isDeepResults
												? "Analysis Complete"
												: "Begin Deep Analysis"}
										</Button>
									</div>
								) : (
									/* Therapist cards — the ONLY scrolling section */
									<div className="flex-1 overflow-y-auto customize-scrollbar pb-6">
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
											{(() => {
												const connectionMap = new Map(
													connections.map((c) => [c.therapistId, c]),
												);
												return therapists.map((t) => {
													const initials = getInitials(t.name);
													const match = Math.round(t.score * 100);
													const isOnline =
														t.therapistId in presenceMap
															? presenceMap[t.therapistId] === "online"
															: t.status === "online";
													const rating = parseFloat(t.rating ?? "5").toFixed(1);
													const tags = getTags(t.specializations);
													const bio =
														t.bio ||
														t.therapyMethods ||
														t.communicationStyle ||
														"";
													const roleLabel =
														t.therapistType ??
														t.communicationStyle?.toUpperCase() ??
														"THERAPIST";
													const conn = connectionMap.get(t.therapistId);
													const nextSlot = conn?.nextSession
														? formatNextSession(conn.nextSession)
														: null;

													return (
														<div
															key={t.therapistId}
															className="bg-surface-container-lowest rounded-md p-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] flex flex-col gap-3 relative cursor-pointer transition-all duration-200 hover:shadow-[0_4px_20px_-4px_rgba(0,50,101,0.13)] hover:-translate-y-px"
														>
															{/* Match Badge */}
															<div className="absolute top-0 right-4 text-[0.58rem] font-extrabold tracking-[0.08em] uppercase bg-on-surface text-white px-2.5 py-1 rounded-b-sm">
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
																	<div className="text-[0.95rem] font-extrabold text-on-surface tracking-[-0.01em] leading-[1.2] mb-1">
																		{t.name}
																	</div>
																	<div className="flex items-center gap-1 text-[0.73rem] font-semibold text-on-surface-variant mb-1.5">
																		<Star
																			weight="fill"
																			className="text-[#f5a623]"
																		/>{" "}
																		{rating}
																		{t.reviewCount ? (
																			<span className="opacity-55">
																				{" "}
																				({t.reviewCount} reviews)
																			</span>
																		) : null}
																	</div>
																	<div className="flex items-center gap-1.5 flex-wrap">
																		<span className="text-[0.58rem] font-extrabold uppercase tracking-widest text-primary">
																			{roleLabel}
																		</span>
																		<span
																			className={`inline-flex items-center gap-0.5 text-[0.58rem] font-bold px-1.5 py-0.5 rounded-full ${isOnline ? "bg-emerald-50 text-emerald-700" : "bg-surface-container text-on-surface-variant/70"}`}
																		>
																			<span
																				className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
																			/>
																			{isOnline ? "Online" : "Offline"}
																		</span>
																	</div>
																</div>
															</div>

															{/* Tags */}
															{tags.length > 0 && (
																<div className="flex flex-wrap gap-1.5">
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
																<p className="text-[0.78rem] text-on-surface-variant leading-[1.6] line-clamp-2">
																	{bio}
																</p>
															)}

															{/* Footer */}
															<div className="flex items-center justify-between pt-3 mt-auto border-t border-surface-container">
																<span className="text-[0.73rem] text-on-surface-variant font-medium">
																	{nextSlot && (
																		<>
																			Next:{" "}
																			<strong className="text-primary font-bold">
																				{nextSlot}
																			</strong>
																		</>
																	)}
																</span>
																<Button
																	className="font-manrope text-[0.73rem] font-bold text-white bg-on-surface hover:opacity-80 rounded-sm px-4 py-1.5 h-auto disabled:opacity-60"
																	onClick={() =>
																		handleRequestChat(t.therapistId)
																	}
																	disabled={
																		requestingId === t.therapistId ||
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
												});
											})()}
										</div>
									</div>
								)}

								{/* AI Card — collapsed by default, expands on click */}
								{!isAnalysing &&
									!loading &&
									!error &&
									therapists.length > 0 && (
										<div className="shrink-0 pb-6 pt-2 flex justify-end">
											{isAiCardExpanded ? (
												<div className="bg-primary-container rounded-md p-6 flex flex-col md:flex-row items-center gap-5 shadow-[0_10px_30px_-10px_rgba(0,50,101,0.08)] max-w-2xl w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
													<div className="flex-1">
														<div className="flex items-center gap-1.5 text-[0.58rem] font-extrabold uppercase tracking-[0.12em] text-primary mb-2">
															<Robot weight="fill" className="text-[0.7rem]" />{" "}
															Deep Discovery AI
														</div>
														<h3 className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-on-surface leading-[1.2] mb-1.5">
															Can&apos;t find the perfect match?
														</h3>
														<p className="text-[0.78rem] text-on-surface-variant leading-[1.6] mb-3.5 max-w-lg">
															Let our AI analyse your intake patterns to
															recommend specialised practitioners from our
															global network.
														</p>
														<Button
															className="font-manrope text-[0.78rem] font-bold text-white bg-primary hover:bg-primary/90 hover:-translate-y-px transition-all rounded-sm px-5 py-2.5 h-auto flex items-center gap-2 shadow-[0_4px_16px_-4px_rgba(73,75,214,0.35)]"
															onClick={handleBeginDeepAnalysis}
															disabled={isAnalysing || isDeepResults}
														>
															<Sparkle weight="fill" />{" "}
															{isDeepResults
																? "Analysis Complete"
																: "Begin Deep Analysis"}
														</Button>
													</div>
													<div
														className="shrink-0 w-22.5 h-22.5 rounded-xl bg-surface-container-lowest flex items-center justify-center cursor-pointer"
														onClick={() => setIsAiCardExpanded(false)}
														title="Collapse"
													>
														<div className="w-12.5 h-12.5 rounded-full bg-primary flex items-center justify-center text-white text-[1.35rem] shadow-[0_0_0_9px_var(--color-primary-container)]">
															<Sparkle weight="fill" />
														</div>
													</div>
												</div>
											) : (
												<button
													className="w-16 h-16 rounded-xl bg-primary-container flex items-center justify-center cursor-pointer hover:-translate-y-0.5 transition-transform duration-150 shadow-[0_4px_16px_-4px_rgba(73,75,214,0.25)]"
													onClick={() => setIsAiCardExpanded(true)}
													title="Deep Discovery AI"
												>
													<div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-[1.15rem] shadow-[0_0_0_6px_var(--color-primary-container)]">
														<Sparkle weight="fill" />
													</div>
												</button>
											)}
										</div>
									)}
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
}
