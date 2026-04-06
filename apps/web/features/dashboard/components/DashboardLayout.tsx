"use client";

import { SidebarProvider } from "@repo/ui";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { checkOnboardingStatus } from "../../../app/onboarding/actions";
import { AppSidebar } from "./AppSidebar";
import { UnreadProvider } from "./UnreadContext";

interface DashboardLayoutProps {
	children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
	const router = useRouter();

	useEffect(() => {
		let cancelled = false;
		checkOnboardingStatus().then((status) => {
			if (cancelled) return;
			if ("error" in status) return;
			if (!status.complete) {
				const target = status.role
					? `/onboarding/${status.role}/step-${status.step}`
					: "/onboarding";
				router.replace(target);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [router]);

	return (
		<UnreadProvider>
			<SidebarProvider>
				<AppSidebar />
				<div className="flex-1 flex flex-col h-screen overflow-hidden bg-surface relative">
					<main className="flex-1 overflow-x-hidden overflow-y-auto">
						{children}
					</main>
				</div>
			</SidebarProvider>
		</UnreadProvider>
	);
}
