"use client";

import {
	createChatSession,
	getChatSessions,
	getConnections,
	getMessages,
	sendMessage as sendMessageAction,
} from "@/app/onboarding/actions";
import { useUnread } from "@/features/dashboard/components/UnreadContext";
import { DashboardPageHeader } from "@/features/dashboard/components/DashboardPageHeader";
import {
	CalendarBlank,
	CaretDown,
	CaretRight,
	ChatCircle,
	ChatCircleDots,
	ClipboardText,
	MagnifyingGlass,
	PaperPlaneTilt,
	Paperclip,
	Sparkle,
	UsersThree,
	Warning,
	X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Connection {
	id: string;
	status: "accepted" | "pending" | string;
	therapistId: string;
	therapistName: string;
	therapistStatus: string | null;
	therapistRating: string | null;
	sessionId: string | null;
	nextSession: string | null;
	therapistSpecializations?: string | null;
	therapistType?: string | null;
}

interface ChatSession {
	id: string;
	connectionId?: string | null;
}

interface Message {
	id?: string;
	role?: string;
	content: string;
	senderId?: string;
	createdAt?: string;
}

type FilterTab = "all" | "active" | "archived" | "requested";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
	return name
		.split(" ")
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");
}

function formatTime(dateStr: string | undefined): string {
	if (!dateStr) return "";
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return "";
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffH = diffMs / 3_600_000;
	const diffD = diffMs / 86_400_000;
	if (diffH < 1) return "Just now";
	if (diffH < 24) return `${Math.floor(diffH)}h ago`;
	if (diffD < 2) return "Yesterday";
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConvListSkeleton() {
	return (
		<div className="flex flex-col gap-1 p-2 animate-pulse">
			{[1, 2, 3].map((i) => (
				<div key={i} className="p-3 rounded-md flex gap-3 items-center">
					<div className="w-9 h-9 rounded-full bg-surface-container shrink-0" />
					<div className="flex-1 flex flex-col gap-1.5">
						<div className="h-3 w-3/4 bg-surface-container rounded-sm" />
						<div className="h-2.5 w-1/2 bg-surface-container rounded-sm" />
					</div>
				</div>
			))}
		</div>
	);
}

function ChatSkeleton() {
	return (
		<div className="flex flex-col gap-4 p-6 animate-pulse">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
				>
					<div className="w-8 h-8 rounded-full bg-surface-container shrink-0" />
					<div
						className={`flex flex-col gap-1.5 max-w-xs ${i % 2 === 0 ? "items-end" : ""}`}
					>
						<div className="h-10 w-48 bg-surface-container rounded-md animate-pulse" />
						<div className="h-2 w-16 bg-surface-container rounded-sm" />
					</div>
				</div>
			))}
		</div>
	);
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function NoConnectionsEmpty() {
	return (
		<div className="flex-1 flex flex-col items-center justify-center gap-5 p-10 text-center">
			<div className="w-16 h-16 rounded-md bg-primary-container flex items-center justify-center">
				<UsersThree className="w-8 h-8 text-primary" weight="fill" />
			</div>
			<div className="flex flex-col gap-2">
				<h3 className="text-base font-bold text-on-surface">No sessions yet</h3>
				<p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">
					Connect with a therapist to start your first session.
				</p>
			</div>
			<a
				href="/find-therapist"
				className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-sm hover:bg-primary/90 transition-colors"
			>
				Find a Therapist
			</a>
		</div>
	);
}

function NoChatSelected() {
	return (
		<div className="flex-1 flex flex-col items-center justify-center gap-5 p-10 text-center">
			<div className="w-16 h-16 rounded-md bg-primary-container flex items-center justify-center">
				<ChatCircleDots className="w-8 h-8 text-primary" weight="fill" />
			</div>
			<div className="flex flex-col gap-2">
				<h3 className="text-base font-bold text-on-surface">
					Select a conversation
				</h3>
				<p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">
					Choose a session from the left panel to start chatting.
				</p>
			</div>
		</div>
	);
}

function NoMessagesEmpty() {
	return (
		<div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
			<div className="w-12 h-12 rounded-md bg-surface-container flex items-center justify-center">
				<Sparkle className="w-6 h-6 text-on-surface-variant" weight="fill" />
			</div>
			<div className="flex flex-col gap-1.5">
				<p className="text-sm font-semibold text-on-surface">
					Start the conversation
				</p>
				<p className="text-xs text-on-surface-variant">
					Send a message to begin your session.
				</p>
			</div>
		</div>
	);
}

function ErrorBanner({
	message,
	onRetry,
}: {
	message: string;
	onRetry?: () => void;
}) {
	return (
		<div className="m-4 p-3 rounded-md bg-error/10 border border-error/20 flex items-start gap-3">
			<Warning className="w-4 h-4 text-error mt-0.5 shrink-0" weight="fill" />
			<div className="flex-1 min-w-0">
				<p className="text-xs font-semibold text-error">{message}</p>
			</div>
			{onRetry && (
				<button
					onClick={onRetry}
					className="text-xs font-bold text-error hover:underline shrink-0"
				>
					Retry
				</button>
			)}
		</div>
	);
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({
	connection,
	sessionId,
	onClose,
}: {
	connection: Connection;
	sessionId: string;
	onClose: () => void;
}) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [msgLoading, setMsgLoading] = useState(true);
	const [msgError, setMsgError] = useState<string | null>(null);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const loadMessages = useCallback(async () => {
		setMsgLoading(true);
		setMsgError(null);
		try {
			const result = await getMessages(sessionId);
			if (result.success && result.data) {
				setMessages(result.data);
			} else {
				setMsgError(result.error ?? "Failed to load messages");
			}
		} catch {
			setMsgError("Network error. Could not load messages.");
		} finally {
			setMsgLoading(false);
		}
	}, [sessionId]);

	useEffect(() => {
		loadMessages();
	}, [loadMessages]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, msgLoading]);

	const handleSend = async () => {
		const text = input.trim();
		if (!text || sending) return;
		const optimistic: Message = {
			content: text,
			role: "patient",
			senderId: "me",
			createdAt: new Date().toISOString(),
		};
		setMessages((prev) => [...prev, optimistic]);
		setInput("");
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
		setSending(true);
		try {
			await sendMessageAction(text, sessionId);
		} catch {
			// optimistic message stays; a real implementation would handle errors
		} finally {
			setSending(false);
		}
	};

	const isOnline = connection.therapistStatus === "online";
	const initials = getInitials(connection.therapistName);

	return (
		<div className="flex flex-col h-full min-h-0">
			{/* Chat header */}
			<div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-outline-variant bg-[rgba(249,249,255,0.97)]">
				<div className="flex items-center gap-3 min-w-0">
					<div className="relative shrink-0">
						<div className="w-10 h-10 rounded-full bg-primary-container text-primary text-sm font-extrabold flex items-center justify-center">
							{initials}
						</div>
						<span
							className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
						/>
					</div>
					<div className="min-w-0">
						<p className="text-sm font-bold text-on-surface truncate leading-tight">
							{connection.therapistName}
						</p>
						<p className="text-[0.7rem] font-medium mt-0.5 flex items-center gap-1">
							<span
								className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
							/>
							<span
								className={
									isOnline
										? "text-emerald-700"
										: "text-on-surface-variant opacity-60"
								}
							>
								{isOnline ? "Online" : "Offline"}
							</span>
							{connection.therapistType && (
								<>
									<span className="text-on-surface-variant opacity-30 mx-0.5">
										·
									</span>
									<span className="text-on-surface-variant opacity-60 truncate">
										{connection.therapistType}
									</span>
								</>
							)}
						</p>
					</div>
				</div>
				<button
					onClick={onClose}
					className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container transition-colors md:hidden"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1 min-h-0">
				{msgLoading ? (
					<ChatSkeleton />
				) : msgError ? (
					<ErrorBanner message={msgError} onRetry={loadMessages} />
				) : messages.length === 0 ? (
					<NoMessagesEmpty />
				) : (
					messages.map((msg, i) => {
						const isPatient =
							msg.role === "patient" ||
							msg.role === "user" ||
							msg.senderId === "me";
						const isAi = msg.role === "assistant";
						return (
							<div
								key={msg.id ?? i}
								className={`flex gap-2.5 mb-2 ${isPatient ? "flex-row-reverse" : ""}`}
							>
								{!isPatient && (
									<div
										className={`w-8 h-8 rounded-full text-[0.6rem] font-extrabold flex items-center justify-center shrink-0 mt-1 ${isAi ? "bg-surface-container-low text-on-surface-variant" : "bg-primary-container text-primary"}`}
									>
										{isAi ? (
											<Sparkle className="w-4 h-4" weight="fill" />
										) : (
											initials
										)}
									</div>
								)}
								<div
									className={`flex flex-col gap-1 max-w-[72%] ${isPatient ? "items-end" : ""}`}
								>
									{isAi && (
										<p className="text-[0.62rem] font-bold text-on-surface-variant opacity-60 px-1">
											Sama AI
										</p>
									)}
									<div
										className={`px-4 py-2.5 rounded-lg text-[0.84rem] leading-relaxed ${
											isPatient
												? "bg-primary text-white rounded-tr-sm"
												: isAi
													? "bg-surface-container border border-outline-variant rounded-tl-sm"
													: "bg-surface-container-low rounded-tl-sm"
										}`}
									>
										{msg.content}
									</div>
									<p className="text-[0.64rem] text-on-surface-variant opacity-50 px-1">
										{formatTime(msg.createdAt)}
									</p>
								</div>
							</div>
						);
					})
				)}
				<div ref={bottomRef} />
			</div>

			{/* Input */}
			<div className="shrink-0 px-4 py-3 border-t border-outline-variant bg-[rgba(249,249,255,0.97)]">
				<div className="flex items-end gap-2 bg-surface-container-low rounded-md border border-outline-variant px-3 py-2 focus-within:border-primary transition-colors">
					<button className="p-1.5 text-on-surface-variant hover:text-primary transition-colors shrink-0">
						<Paperclip className="w-4 h-4" />
					</button>
					<textarea
						ref={textareaRef}
						rows={1}
						className="flex-1 bg-transparent text-[0.84rem] text-on-surface placeholder:text-on-surface-variant placeholder:opacity-40 resize-none outline-none leading-relaxed min-h-[28px] max-h-28 py-0.5"
						placeholder="Share what's on your mind…"
						value={input}
						onChange={(e) => {
							setInput(e.target.value);
							e.target.style.height = "auto";
							e.target.style.height = e.target.scrollHeight + "px";
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
					/>
					<button
						onClick={handleSend}
						disabled={!input.trim() || sending}
						className="p-2 rounded-sm bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0"
					>
						<PaperPlaneTilt className="w-4 h-4" weight="fill" />
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface SessionThread {
	type: "chat" | "notes" | "homework" | "ai";
	label: string;
	preview: string;
	sessionId: string;
	unread?: number;
}

interface TherapistGroup {
	connection: Connection;
	threads: SessionThread[];
	totalUnread: number;
	isExpanded: boolean;
}

export default function SessionsPage() {
	const { setTotalUnread } = useUnread();

	const [groups, setGroups] = useState<TherapistGroup[]>([]);
	const [requestedConnections, setRequestedConnections] = useState<
		Connection[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [search, setSearch] = useState("");
	const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
		null,
	);
	const [selectedConnection, setSelectedConnection] =
		useState<Connection | null>(null);
	const [creatingSession, setCreatingSession] = useState<string | null>(null); // connectionId

	// Load data
	const loadData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [connResult, sessionResult] = await Promise.all([
				getConnections("patient"),
				getChatSessions(),
			]);

			if (!connResult.success) {
				setError(connResult.error ?? "Failed to load connections");
				return;
			}

			const allConnections: Connection[] = connResult.data ?? [];
			const sessions: ChatSession[] = sessionResult.success
				? (sessionResult.data ?? [])
				: [];

			// Build a map: connectionId -> sessionId
			const connSessionMap: Record<string, string> = {};
			sessions.forEach((s) => {
				if (s.connectionId) connSessionMap[s.connectionId] = s.id;
			});

			const accepted = allConnections.filter((c) => c.status === "accepted");
			const pending = allConnections.filter((c) => c.status === "pending");

			const built: TherapistGroup[] = accepted.map((conn) => {
				const sid = connSessionMap[conn.id] ?? conn.sessionId;
				const threads: SessionThread[] = sid
					? [
							{
								type: "chat",
								label: "Chat",
								preview: "Continue your conversation…",
								sessionId: sid,
								unread: 0,
							},
						]
					: [];

				return {
					connection: { ...conn, sessionId: sid ?? null },
					threads,
					totalUnread: 0,
					isExpanded: true,
				};
			});

			setGroups(built);
			setRequestedConnections(pending);

			// Update sidebar badge
			const total = built.reduce((sum, g) => sum + g.totalUnread, 0);
			setTotalUnread(total);
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [setTotalUnread]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const toggleGroup = (connId: string) => {
		setGroups((prev) =>
			prev.map((g) =>
				g.connection.id === connId ? { ...g, isExpanded: !g.isExpanded } : g,
			),
		);
	};

	const handleSelectThread = async (
		thread: SessionThread,
		conn: Connection,
	) => {
		setSelectedSessionId(thread.sessionId);
		setSelectedConnection(conn);
	};

	const handleSelectConnection = async (conn: Connection) => {
		if (conn.sessionId) {
			setSelectedSessionId(conn.sessionId);
			setSelectedConnection(conn);
			return;
		}
		// Create a new session for this connection
		setCreatingSession(conn.id);
		try {
			const result = await createChatSession(conn.id);
			if (result.success && result.data) {
				const newId = result.data.sessionId ?? result.data.id;
				// Update group sessionId
				setGroups((prev) =>
					prev.map((g) =>
						g.connection.id === conn.id
							? {
									...g,
									connection: { ...g.connection, sessionId: newId },
									threads: [
										{
											type: "chat",
											label: "Chat",
											preview: "Session started…",
											sessionId: newId,
											unread: 0,
										},
									],
								}
							: g,
					),
				);
				setSelectedSessionId(newId);
				setSelectedConnection({ ...conn, sessionId: newId });
			}
		} catch {
			// fail silently
		} finally {
			setCreatingSession(null);
		}
	};

	// Filtered groups
	const filteredGroups = groups.filter((g) => {
		if (activeFilter === "requested") return false;
		if (activeFilter === "active" && g.threads.length === 0) return false;
		if (activeFilter === "archived") return false; // placeholder
		const q = search.toLowerCase();
		return !q || g.connection.therapistName.toLowerCase().includes(q);
	});

	const showRequested = activeFilter === "all" || activeFilter === "requested";

	const filterTabs: { key: FilterTab; label: string }[] = [
		{ key: "all", label: "All" },
		{ key: "active", label: "Active" },
		{ key: "archived", label: "Archived" },
		{ key: "requested", label: "Requested" },
	];

	const threadIcon = {
		chat: <ChatCircle className="w-3.5 h-3.5" weight="fill" />,
		notes: <ClipboardText className="w-3.5 h-3.5" weight="fill" />,
		homework: <ClipboardText className="w-3.5 h-3.5" weight="bold" />,
		ai: <Sparkle className="w-3.5 h-3.5" weight="fill" />,
	};

	const threadIconColor = {
		chat: "bg-primary-container text-primary",
		notes: "bg-secondary-container text-secondary",
		homework: "bg-tertiary-container text-tertiary",
		ai: "bg-surface-container-low text-on-surface-variant",
	};

	return (
		<div className="flex flex-col h-full w-full overflow-hidden">
			<DashboardPageHeader
				title="Sessions"
				description="Your therapy conversations, all in one place."
			/>

			{!loading &&
			!error &&
			groups.length === 0 &&
			requestedConnections.length === 0 ? (
				<NoConnectionsEmpty />
			) : (
				<div className="flex flex-1 min-h-0 overflow-hidden">
					{/* ── Left Panel: Conversation List ──────────────────────── */}
					<div
						className={`flex flex-col border-r border-outline-variant bg-[rgba(249,249,255,0.97)] w-[300px] shrink-0 h-full transition-all ${selectedSessionId ? "hidden md:flex" : "flex"}`}
					>
						{/* Panel header */}
						<div className="shrink-0 px-4 pt-5 pb-3 border-b border-outline-variant">
							<h2 className="text-base font-extrabold text-on-surface tracking-[-0.02em] mb-3">
								Sessions
							</h2>
							{/* Search */}
							<div className="relative">
								<MagnifyingGlass
									className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40 pointer-events-none"
									size={14}
								/>
								<input
									type="text"
									placeholder="Search conversations…"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="w-full pl-8 pr-3 py-2 text-[0.8rem] bg-surface-container-low border border-outline-variant rounded-md focus:outline-none focus:border-primary placeholder:text-on-surface-variant placeholder:opacity-40"
								/>
							</div>
							{/* Filter tabs */}
							<div className="flex gap-1 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
								{filterTabs.map((tab) => (
									<button
										key={tab.key}
										onClick={() => setActiveFilter(tab.key)}
										className={`shrink-0 px-3 py-1 rounded-full text-[0.7rem] font-bold transition-colors ${
											activeFilter === tab.key
												? "bg-primary text-white"
												: "text-on-surface-variant hover:bg-surface-container"
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>
						</div>

						{/* List */}
						<div className="flex-1 overflow-y-auto py-2 min-h-0">
							{loading ? (
								<ConvListSkeleton />
							) : error ? (
								<ErrorBanner message={error} onRetry={loadData} />
							) : (
								<>
									{filteredGroups.map((group) => {
										const conn = group.connection;
										const initials = getInitials(conn.therapistName);
										const isOnline = conn.therapistStatus === "online";
										const creating = creatingSession === conn.id;

										return (
											<div key={conn.id} className="mb-0.5">
												{/* Therapist group header */}
												<button
													onClick={() =>
														group.threads.length > 0
															? toggleGroup(conn.id)
															: handleSelectConnection(conn)
													}
													className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container/60 transition-colors text-left rounded-md mx-1"
													style={{ width: "calc(100% - 8px)" }}
												>
													<div className="relative shrink-0">
														<div className="w-9 h-9 rounded-full bg-primary-container text-primary text-[0.65rem] font-extrabold flex items-center justify-center">
															{initials}
														</div>
														{isOnline && (
															<span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
														)}
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-[0.8rem] font-bold text-on-surface truncate leading-tight">
															{conn.therapistName}
														</p>
														<p className="text-[0.68rem] text-on-surface-variant opacity-60 truncate">
															{conn.therapistType ?? "Therapist"}
														</p>
													</div>
													<div className="flex items-center gap-1.5 shrink-0">
														{group.totalUnread > 0 && (
															<span className="text-[0.6rem] font-extrabold bg-primary text-white px-1.5 py-0.5 rounded-full min-w-5 text-center">
																{group.totalUnread}
															</span>
														)}
														{creating ? (
															<div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
														) : group.threads.length > 0 ? (
															group.isExpanded ? (
																<CaretDown
																	className="w-3 h-3 text-on-surface-variant opacity-50"
																	weight="bold"
																/>
															) : (
																<CaretRight
																	className="w-3 h-3 text-on-surface-variant opacity-50"
																	weight="bold"
																/>
															)
														) : (
															<CalendarBlank className="w-3.5 h-3.5 text-on-surface-variant opacity-40" />
														)}
													</div>
												</button>

												{/* Session threads */}
												{group.isExpanded && group.threads.length > 0 && (
													<div className="ml-4 pl-5 border-l border-outline-variant/50 mb-1">
														{group.threads.map((thread) => {
															const isSelected =
																selectedSessionId === thread.sessionId;
															return (
																<button
																	key={thread.sessionId}
																	onClick={() =>
																		handleSelectThread(thread, conn)
																	}
																	className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors mb-0.5 ${
																		isSelected
																			? "bg-primary-container/60"
																			: "hover:bg-surface-container/50"
																	}`}
																>
																	<div
																		className={`w-6 h-6 rounded-sm flex items-center justify-center shrink-0 ${threadIconColor[thread.type]}`}
																	>
																		{threadIcon[thread.type]}
																	</div>
																	<div className="flex-1 min-w-0">
																		<p
																			className={`text-[0.76rem] font-semibold truncate leading-tight ${isSelected ? "text-primary" : "text-on-surface"}`}
																		>
																			{thread.label}
																		</p>
																		<p className="text-[0.67rem] text-on-surface-variant opacity-55 truncate mt-0.5">
																			{thread.preview}
																		</p>
																	</div>
																	{(thread.unread ?? 0) > 0 && (
																		<span className="text-[0.58rem] font-extrabold bg-primary text-white px-1.5 py-0.5 rounded-full shrink-0">
																			{thread.unread}
																		</span>
																	)}
																</button>
															);
														})}
													</div>
												)}

												{/* No session yet — start session CTA */}
												{group.isExpanded && group.threads.length === 0 && (
													<div className="mx-3 mb-1 px-3 py-2.5 rounded-md bg-surface-container/40 border border-dashed border-outline-variant">
														<p className="text-[0.72rem] text-on-surface-variant opacity-60 mb-2">
															No active session
														</p>
														<button
															onClick={() => handleSelectConnection(conn)}
															disabled={creating}
															className="text-[0.72rem] font-bold text-primary hover:underline disabled:opacity-50"
														>
															{creating ? "Starting…" : "Start session →"}
														</button>
													</div>
												)}
											</div>
										);
									})}

									{/* Requested connections */}
									{showRequested &&
										requestedConnections.map((conn) => {
											const initials = getInitials(conn.therapistName);
											return (
												<div key={conn.id} className="mb-1">
													<div className="mx-1 rounded-md border border-amber-200 bg-amber-50/60 p-3">
														<div className="flex items-center gap-2.5 mb-2.5">
															<div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 text-[0.65rem] font-extrabold flex items-center justify-center shrink-0">
																{initials}
															</div>
															<div className="flex-1 min-w-0">
																<p className="text-[0.78rem] font-bold text-on-surface truncate leading-tight">
																	{conn.therapistName}
																</p>
																<p className="text-[0.67rem] text-amber-700 font-semibold">
																	Request Pending
																</p>
															</div>
														</div>
														<div className="flex items-center gap-1.5 mb-2">
															<span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
															<p className="text-[0.7rem] text-on-surface-variant">
																Awaiting therapist approval
															</p>
														</div>
														<div className="flex gap-2">
															<button className="flex-1 py-1.5 text-[0.7rem] font-bold border border-outline-variant rounded-sm text-on-surface-variant hover:bg-surface-container transition-colors">
																Cancel
															</button>
															<a
																href={`/find-therapist?therapistId=${conn.therapistId}`}
																className="flex-1 py-1.5 text-[0.7rem] font-bold bg-primary-container text-primary rounded-sm hover:bg-primary/10 transition-colors text-center"
															>
																View profile
															</a>
														</div>
													</div>
												</div>
											);
										})}

									{filteredGroups.length === 0 && !showRequested && (
										<div className="px-4 py-6 text-center">
											<p className="text-sm text-on-surface-variant opacity-50">
												No conversations match your filter.
											</p>
										</div>
									)}
								</>
							)}
						</div>
					</div>

					{/* ── Right Panel: Chat / Empty state ─────────────────────── */}
					<div
						className={`flex-1 flex flex-col h-full min-w-0 ${selectedSessionId ? "flex" : "hidden md:flex"}`}
					>
						{!selectedSessionId || !selectedConnection ? (
							loading ? (
								<div className="flex-1 flex flex-col">
									<div className="shrink-0 p-4 border-b border-outline-variant">
										<div className="h-10 w-48 bg-surface-container rounded-md animate-pulse" />
									</div>
									<ChatSkeleton />
								</div>
							) : (
								<NoChatSelected />
							)
						) : (
							<ChatPanel
								key={selectedSessionId}
								connection={selectedConnection}
								sessionId={selectedSessionId}
								onClose={() => {
									setSelectedSessionId(null);
									setSelectedConnection(null);
								}}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
