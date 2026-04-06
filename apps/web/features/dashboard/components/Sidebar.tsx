"use client";
import { useEffect, useState } from "react";

import { checkOnboardingStatus } from "@/app/onboarding/actions";
import {
	Gear,
	House,
	MagnifyingGlass,
	Notebook,
	SignOut,
	Sparkle,
	Users,
} from "@phosphor-icons/react";
import { cn } from "@repo/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
	const pathname = usePathname();
	const [role, setRole] = useState<string | null>(null);

	useEffect(() => {
		async function load() {
			try {
				const status = await checkOnboardingStatus();
				setRole(status.role || "patient");
			} catch (e) {
				console.error("Failed to load role:", e);
			}
		}
		load();
	}, []);

	const isTherapist = role === "therapist";

	const navItems = [
		{
			label: "Home",
			href: isTherapist ? "/connections" : "/find-therapist",
			icon: House,
		},
		{ label: "Journal", href: "/journal", icon: Notebook },
		{ label: "Community", href: "/community", icon: Users },
		{
			label: "Explore",
			href: "/find-therapist",
			icon: MagnifyingGlass,
			hidden: isTherapist,
		},
	].filter((i) => !i.hidden);

	return (
		<aside className="w-[280px] h-screen bg-[var(--surface-container-lowest)] border-r border-[var(--outline-variant)] flex flex-col sticky top-0">
			{/* Brand */}
			<div className="p-6 mb-2">
				<Link
					href={isTherapist ? "/connections" : "/find-therapist"}
					className="flex items-center gap-2"
				>
					<div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white shadow-lg shadow-primary/20">
						<Sparkle weight="fill" size={18} />
					</div>
					<span className="text-xl font-extrabold tracking-tight text-[var(--on-surface)]">
						Sama
					</span>
				</Link>
			</div>

			{/* Primary Nav */}
			<nav className="flex-1 px-4 space-y-1">
				<div className="px-2 mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
					Menu
				</div>
				{navItems.map((item) => {
					const isActive = pathname === item.href;
					return (
						<Link
							key={item.label}
							href={item.href}
							className={cn(
								"flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] transition-all duration-200 group relative",
								isActive
									? "bg-[var(--secondary-container)] text-[var(--on-secondary-container)] font-bold shadow-sm"
									: "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)]",
							)}
						>
							<item.icon
								weight={isActive ? "fill" : "regular"}
								size={22}
								className={cn(
									isActive
										? "text-[var(--primary)]"
										: "group-hover:text-[var(--primary)]",
								)}
							/>
							<span className="text-[0.9rem]">{item.label}</span>
							{isActive && (
								<div className="absolute left-0 w-1 h-6 bg-[var(--primary)] rounded-r-full" />
							)}
						</Link>
					);
				})}

			</nav>

			{/* Bottom Actions */}
			<div className="p-4 border-t border-[var(--outline-variant)] space-y-1">
				<button className="w-full flex items-center gap-3 px-3 py-2 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] rounded-lg transition-colors text-[0.85rem]">
					<Gear size={20} />
					<span>Settings</span>
				</button>
				<button className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-[0.85rem]">
					<SignOut size={20} />
					<span>Sign Out</span>
				</button>
			</div>
		</aside>
	);
}
