"use client";

import {
	checkOnboardingStatus,
	getConnections,
} from "@/app/onboarding/actions";
import { signOut, useSession } from "@/features/auth/api/client";
import {
	PresenceStatus,
	usePresenceSocket,
} from "@/features/chat/hooks/usePresenceSocket";
import {
	Bell,
	CalendarBlank,
	CaretLeft,
	CaretRight,
	ChartBar,
	ChartLineUp,
	Chats,
	ClipboardText,
	DotsThreeVertical,
	FirstAid,
	Gear,
	Notebook,
	SignOut,
	SquaresFour,
	UserFocus,
	Users,
	Warning,
} from "@phosphor-icons/react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
	cn,
	useSidebar,
} from "@repo/ui";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useUnread } from "./UnreadContext";

interface Connection {
	id: string;
	status: string;
	therapistName?: string;
	patientName?: string;
	therapistStatus?: string;
	sessionId?: string;
	nextSession?: string | null;
}

const navMain = [
	{
		title: "Main",
		items: [
			{ title: "Overview", url: "/overview", icon: SquaresFour },
			{
				title: "Find Therapist",
				url: "/find-therapist",
				icon: UserFocus,
			},
			{ title: "Sessions", url: "/sessions", icon: CalendarBlank },
		],
	},
	{
		title: "Wellbeing",
		items: [
			{ title: "Journal", url: "/journal", icon: Notebook },
			{ title: "Progress", url: "/progress", icon: ChartLineUp },
			{ title: "Resources", url: "/resources", icon: FirstAid },
		],
	},
];

const navTherapist = [
	{
		title: "Workspace",
		items: [
			{ title: "Dashboard", url: "/overview", icon: SquaresFour },
			{ title: "Patients", url: "/patients", icon: Users },
			{ title: "Sessions", url: "/sessions", icon: CalendarBlank },
			{ title: "Messages", url: "/messages", icon: Chats },
			{ title: "Analytics", url: "/analytics", icon: ChartBar },
		],
	},
	{
		title: "Clinical",
		items: [
			{ title: "Notes", url: "/notes", icon: ClipboardText },
			{ title: "Crisis Alerts", url: "/crisis-alerts", icon: Bell },
			{ title: "Schedule", url: "/schedule", icon: CalendarBlank },
		],
	},
];

function formatNextSession(
	date: string | Date | null | undefined,
): string | null {
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

function getInitials(name: string): string {
	return name
		.split(" ")
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");
}

function SidebarToggle() {
	const { state, toggleSidebar } = useSidebar();
	return (
		<button
			onClick={toggleSidebar}
			className="absolute -right-[14px] bottom-0 translate-y-1/2 z-20 w-7 h-7 rounded-sm bg-[rgba(249,249,255,0.98)] border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary shadow-sm transition-all duration-200"
		>
			{state === "expanded" ? (
				<CaretLeft weight="bold" size={14} />
			) : (
				<CaretRight weight="bold" size={14} />
			)}
		</button>
	);
}

export function AppSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const { data: session } = useSession();
	const { state: sidebarState } = useSidebar();
	const { totalUnread } = useUnread();

	const [role, setRole] = useState<string>("patient");
	const [connections, setConnections] = useState<Connection[]>([]);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const { presenceMap, setStatus } = usePresenceSocket();
	const myUserId = session?.user?.id;
	const myStatus: PresenceStatus =
		(myUserId ? presenceMap[myUserId] : undefined) ?? "online";

	const userName = session?.user?.name ?? "…";
	const userEmail = session?.user?.email;
	const initials = session?.user?.name ? getInitials(session.user.name) : "…";

	// Load role + connections
	useEffect(() => {
		async function load() {
			try {
				const status = await checkOnboardingStatus();
				const activeRole = status.role ?? "patient";
				setRole(activeRole);
				const result = await getConnections(
					activeRole as "patient" | "therapist",
				);
				if (result.success && result.data) setConnections(result.data);
			} catch {
				// fail silently
			}
		}
		load();
	}, []);

	// Close menu on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		}
		if (menuOpen) document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [menuOpen]);

	const handleSignOut = async () => {
		await signOut();
		router.push("/signin");
	};

	const acceptedConnections = connections.filter(
		(c) => c.status === "accepted",
	);

	return (
		<Sidebar
			collapsible="icon"
			className="bg-surface-container-lowest border-outline-variant"
		>
			{/* Header */}
			<SidebarHeader className="h-14 flex-row items-center justify-between px-3 border-b border-outline-variant bg-[rgba(249,249,255,0.95)] overflow-visible relative">
				<Link href="/overview" className="flex items-center gap-2.5 min-w-0">
					<Image
						src="/brand-logo.svg"
						alt="Sama"
						width={36}
						height={36}
						className="shrink-0 rounded-sm"
					/>
					<span className="font-bold text-[0.88rem] text-on-surface tracking-[-0.01em] truncate group-data-[collapsible=icon]:hidden">
						Sama
					</span>
				</Link>
				<SidebarToggle />
			</SidebarHeader>

			<SidebarContent className="py-2 no-scrollbar overflow-x-hidden">
				{/* Nav groups */}
				{(role === "therapist" ? navTherapist : navMain).map((group, idx) => {
					const activeNav = role === "therapist" ? navTherapist : navMain;
					return (
						<React.Fragment key={group.title}>
							<SidebarGroup>
								<SidebarGroupLabel className="text-[0.58rem] font-bold tracking-[0.1em] uppercase text-on-surface-variant opacity-50 px-3">
									{group.title}
								</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{group.items.map((item) => (
											<SidebarMenuItem key={item.title}>
												<SidebarMenuButton
													asChild
													isActive={pathname === item.url}
													tooltip={item.title}
													className="py-5 font-manrope hover:bg-surface-container-low hover:text-on-surface data-[active=true]:bg-surface-container-low data-[active=true]:text-primary data-[active=true]:font-bold text-on-surface-variant font-semibold text-[0.8rem]"
												>
													<Link href={item.url}>
														<item.icon
															weight={
																pathname === item.url ? "fill" : "regular"
															}
															className="!size-4"
														/>
														<span>{item.title}</span>
														{item.url === "/sessions" && totalUnread > 0 && (
															<span className="ml-auto text-[0.6rem] font-extrabold bg-primary-container text-primary px-1.5 py-0.5 rounded-full group-data-[collapsible=icon]:hidden">
																{totalUnread}
															</span>
														)}
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
							{idx < activeNav.length - 1 && (
								<SidebarSeparator className="mx-3 my-1 bg-outline-variant" />
							)}
						</React.Fragment>
					);
				})}
				{acceptedConnections.length > 0 && (
					<>
						<SidebarSeparator className="mx-3 my-1 bg-outline-variant" />
						<SidebarGroup>
							<SidebarGroupLabel className="text-[0.58rem] font-bold tracking-[0.1em] uppercase text-on-surface-variant opacity-50 px-3 group-data-[collapsible=icon]:hidden">
								{role === "therapist" ? "Your Patients" : "Your Clinicians"}
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{acceptedConnections.map((conn) => {
										const name =
											conn.therapistName || conn.patientName || "Anonymous";
										const nextSession = formatNextSession(conn.nextSession);
										const chatPath = conn.sessionId
											? `/chat/${conn.sessionId}`
											: `/chat?connectionId=${conn.id}`;
										const isActive =
											pathname.includes(conn.id) ||
											(conn.sessionId && pathname.includes(conn.sessionId));

										return (
											<SidebarMenuItem key={conn.id}>
												<SidebarMenuButton
													asChild
													isActive={!!isActive}
													tooltip={name}
													className="h-auto py-2 hover:bg-surface-container-low data-[active=true]:bg-surface-container-low text-on-surface-variant"
												>
													<Link
														href={chatPath}
														className="flex items-center gap-2.5"
													>
														<div className="w-7 h-7 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0 relative">
															<Image
																src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
																alt={name}
																width={28}
																height={28}
																className="w-full h-full object-cover"
															/>
															<div
																className={cn(
																	"absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white",
																	conn.therapistStatus === "online"
																		? "bg-emerald-500"
																		: "bg-slate-300",
																)}
															/>
														</div>
														<div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
															<span className="text-[0.78rem] font-semibold text-on-surface truncate leading-tight">
																{name}
															</span>
															{nextSession && (
																<span className="text-[0.65rem] text-on-surface-variant opacity-60 truncate mt-0.5">
																	Next: {nextSession}
																</span>
															)}
														</div>
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										);
									})}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</>
				)}
			</SidebarContent>

			<SidebarFooter className="border-t border-outline-variant p-2 pb-8">
				<SidebarMenu>
					{role !== "therapist" && (
						<SidebarMenuItem>
							<SidebarMenuButton
								tooltip="Emergency Support"
								className="bg-on-surface hover:bg-on-surface/85 text-white hover:text-white rounded-sm font-manrope font-bold text-[0.75rem] py-5 mb-1
                group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:mb-1"
							>
								<Warning weight="fill" className="size-4 shrink-0" />
								<span className="group-data-[collapsible=icon]:hidden">
									Emergency Support
								</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}
					<SidebarMenuItem>
						<div ref={menuRef} className="relative w-full">
							{/* Profile popup */}
							{menuOpen && (
								<div
									className={`absolute bottom-full left-0 mb-1 bg-white border border-outline-variant rounded-md shadow-[0_8px_24px_-6px_rgba(0,0,0,0.14)] overflow-hidden z-50 ${sidebarState === "expanded" ? "right-0" : "min-w-50"}`}
								>
									{/* Profile header */}
									<div className="px-3 py-2.5 border-b border-outline-variant">
										<p className="text-[0.78rem] font-bold text-on-surface truncate leading-tight">
											{userName}
										</p>
										{userEmail && (
											<p className="text-[0.67rem] text-on-surface-variant truncate mt-0.5">
												{userEmail}
											</p>
										)}
									</div>{" "}
									{role === "therapist" && (
										<div className="border-b border-outline-variant">
											<p className="px-3 pt-2 pb-1 text-[0.6rem] font-bold tracking-[0.08em] uppercase text-on-surface-variant opacity-50">
												Status
											</p>
											{(
												[
													{
														value: "online",
														label: "Available",
														dot: "bg-emerald-500",
													},
													{ value: "busy", label: "Busy", dot: "bg-amber-400" },
													{
														value: "unavailable",
														label: "Appear Away",
														dot: "bg-orange-400",
													},
													{
														value: "offline",
														label: "Appear Offline",
														dot: "bg-slate-300",
													},
												] as {
													value: PresenceStatus;
													label: string;
													dot: string;
												}[]
											).map((opt) => (
												<button
													key={opt.value}
													onClick={() => {
														setStatus(opt.value);
														setMenuOpen(false);
													}}
													className={cn(
														"w-full flex items-center gap-2.5 px-3 py-2 text-[0.78rem] font-semibold transition-colors",
														myStatus === opt.value
															? "bg-surface-container-low text-on-surface"
															: "text-on-surface-variant hover:bg-surface-container-low",
													)}
												>
													<span
														className={cn(
															"w-2 h-2 rounded-full shrink-0",
															opt.dot,
														)}
													/>
													{opt.label}
													{myStatus === opt.value && (
														<span className="ml-auto text-[0.6rem] font-bold text-primary">
															✓
														</span>
													)}
												</button>
											))}
										</div>
									)}
									<Link
										href="/settings"
										className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[0.78rem] text-on-surface-variant hover:bg-surface-container-low transition-colors font-semibold"
										onClick={() => setMenuOpen(false)}
									>
										<Gear weight="bold" size={15} />
										Settings
									</Link>
									<button
										onClick={handleSignOut}
										className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[0.78rem] text-red-600 hover:bg-red-50 transition-colors font-semibold"
									>
										<SignOut weight="bold" size={15} />
										Sign out
									</button>
								</div>
							)}

							<SidebarMenuButton
								tooltip={userName}
								onClick={() => setMenuOpen((v) => !v)}
								style={
									sidebarState === "expanded"
										? { height: "auto", padding: "10px" }
										: {}
								}
								className={`hover:bg-surface-container-low rounded-sm cursor-pointer ${sidebarState === "expanded" ? "border border-outline-variant hover:border-outline/50" : ""} group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto`}
							>
								<div className="relative shrink-0">
									<div
										className="w-[30px] h-[30px] rounded-sm bg-primary text-white flex items-center justify-center text-[0.62rem] font-extrabold group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:text-[0.5rem]"
										suppressHydrationWarning
									>
										{initials}
									</div>
									{role === "therapist" && (
										<span
											className={cn(
												"absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
												myStatus === "online"
													? "bg-emerald-500"
													: myStatus === "busy"
														? "bg-amber-400"
														: myStatus === "unavailable"
															? "bg-orange-400"
															: "bg-slate-300",
											)}
										/>
									)}
								</div>
								<div className="flex flex-col flex-1 text-left min-w-0 group-data-[collapsible=icon]:hidden">
									<span
										className="text-[0.75rem] font-bold text-on-surface truncate leading-tight"
										suppressHydrationWarning
									>
										{userName}
									</span>
									<span
										className="text-[0.6rem] text-on-surface-variant truncate"
										suppressHydrationWarning
									>
										{userEmail ?? ""}
									</span>
								</div>
								<DotsThreeVertical
									weight="bold"
									className="text-on-surface-variant opacity-45 size-4 shrink-0 group-data-[collapsible=icon]:hidden"
								/>
							</SidebarMenuButton>
						</div>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
