"use client";

import {
	CalendarBlank,
	CaretLeft,
	CaretRight,
	ChartLineUp,
	DotsThreeVertical,
	FirstAid,
	Gear,
	Notebook,
	ShieldCheck,
	SquaresFour,
	UserFocus,
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
	useSidebar,
} from "@repo/ui";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

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

// This is sample data.
const data = {
	user: {
		name: "Jordan Davies",
		role: "Patient",
		initials: "JD",
	},
	navMain: [
		{
			title: "Main",
			items: [
				{
					title: "Overview",
					url: "/dashboard",
					icon: SquaresFour,
				},
				{
					title: "Find Therapist",
					url: "/dashboard/find-therapist",
					icon: UserFocus,
					isActive: true,
				},
				{
					title: "Sessions",
					url: "/dashboard/sessions",
					icon: CalendarBlank,
					badge: "2",
				},
			],
		},
		{
			title: "Wellbeing",
			items: [
				{
					title: "Journal",
					url: "/dashboard/journal",
					icon: Notebook,
				},
				{
					title: "Progress",
					url: "/dashboard/progress",
					icon: ChartLineUp,
				},
				{
					title: "Resources",
					url: "/dashboard/resources",
					icon: FirstAid,
				},
			],
		},
		{
			title: "Account",
			items: [
				{
					title: "Settings",
					url: "/dashboard/settings",
					icon: Gear,
				},
				{
					title: "Privacy",
					url: "/dashboard/privacy",
					icon: ShieldCheck,
				},
			],
		},
	],
};

export function AppSidebar() {
	const pathname = usePathname();

	return (
		<Sidebar
			collapsible="icon"
			className="bg-surface-container-lowest border-outline-variant"
		>
			{/* Header: logo always visible at full size, text hidden when collapsed */}
			<SidebarHeader className="h-14 flex-row items-center justify-between px-3 border-b border-outline-variant bg-[rgba(249,249,255,0.95)] overflow-visible relative">
				<Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
					<Image
						src="/brand-logo.svg"
						alt="Clinical Serenity"
						width={36}
						height={36}
						className="shrink-0 rounded-sm"
					/>
					<span className="font-bold text-[0.88rem] text-on-surface tracking-[-0.01em] truncate group-data-[collapsible=icon]:hidden">
						Clinical Serenity
					</span>
				</Link>
				{/* Toggle always at right intersection */}
				<SidebarToggle />
			</SidebarHeader>

			<SidebarContent className="py-2">
				{data.navMain.map((group) => (
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
														weight={pathname === item.url ? "fill" : "regular"}
														className="!size-4"
													/>
													<span>{item.title}</span>
													{item.badge && (
														<span className="ml-auto text-[0.6rem] font-extrabold bg-primary-container text-primary px-1.5 py-0.5 rounded-full group-data-[collapsible=icon]:hidden">
															{item.badge}
														</span>
													)}
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
						{group.title !== "Account" && (
							<SidebarSeparator className="mx-3 my-1 bg-outline-variant" />
						)}
					</React.Fragment>
				))}
			</SidebarContent>

			<SidebarFooter className="border-t border-outline-variant p-2">
				<SidebarMenu>
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
					<SidebarMenuItem>
						<SidebarMenuButton
							tooltip={data.user.name}
							className="hover:bg-surface-container-low rounded-sm py-2
                group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto"
						>
							<div className="w-[30px] h-[30px] rounded-sm bg-primary text-white flex items-center justify-center text-[0.62rem] font-extrabold shrink-0 group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:text-[0.5rem]">
								{data.user.initials}
							</div>
							<div className="flex flex-col flex-1 text-left min-w-0 group-data-[collapsible=icon]:hidden">
								<span className="text-[0.75rem] font-bold text-on-surface truncate leading-tight">
									{data.user.name}
								</span>
								<span className="text-[0.6rem] text-on-surface-variant truncate">
									{data.user.role}
								</span>
							</div>
							<DotsThreeVertical
								weight="bold"
								className="text-on-surface-variant opacity-45 size-4 shrink-0 group-data-[collapsible=icon]:hidden"
							/>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
