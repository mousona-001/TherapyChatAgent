import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";
import { env } from "./config/env";

export interface Session {
	user: {
		id: string;
		email: string;
		role?: string;
		name?: string;
	};
	session: {
		id: string;
		userId: string;
		expiresAt: Date;
	};
}

const publicRoutes = ["/", "/about", "/pricing"];
const authRoutes = ["/signin", "/signup"]; // Updated routes

/**
 * Modern Next.js Proxy implementation.
 * Handles authentication, role selection, and session validation.
 */
export default async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// 1. Skip API routes — they are handled by Next.js rewrites in next.config.ts
	if (pathname.startsWith("/api/") || pathname.startsWith("/trpc/")) {
		return NextResponse.next();
	}

	const isPublicRoute = publicRoutes.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
	const isAuthRoute = authRoutes.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
	const isProtectedRoute =
		pathname.startsWith("/app") ||
		pathname.startsWith("/onboarding") ||
		pathname.startsWith("/overview") ||
		pathname.startsWith("/find-therapist") ||
		pathname.startsWith("/sessions") ||
		pathname.startsWith("/connections") ||
		pathname.startsWith("/journal") ||
		pathname.startsWith("/progress") ||
		pathname.startsWith("/resources") ||
		pathname.startsWith("/settings") ||
		pathname.startsWith("/privacy");

	const sessionCookie = getSessionCookie(request);

	// 2. Public routes — always accessible
	if (isPublicRoute && !isProtectedRoute && !isAuthRoute) {
		return NextResponse.next();
	}

	// 3. Protected routes — use cookie as first gate (no API call required).
	//    This prevents kicking users to /signin when the API is temporarily unreachable.
	if (isProtectedRoute && !sessionCookie) {
		return NextResponse.redirect(new URL("/signin", request.url));
	}

	// 4. Fetch full session only when needed for role-based routing.
	//    If the API is unreachable we degrade gracefully — real auth is enforced at the API boundary.
	let session: Session | null = null;
	if (sessionCookie || isAuthRoute) {
		session = await getSession(request);
	}

	// 5. Auth routes — redirect to dashboard if already logged in
	if (isAuthRoute && session) {
		const role = session.user?.role;
		if (!role) {
			return NextResponse.redirect(new URL("/onboarding", request.url));
		}
		const homePath = role === "patient" ? "/overview" : "/connections";
		return NextResponse.redirect(new URL(homePath, request.url));
	}

	// 6. Role protection — if session exists but no role, must go to onboarding
	// We allow /find-therapist, /connections, and /chat as they are the final stages where the role might not have synced yet
	const isPostOnboarding =
		pathname.startsWith("/overview") ||
		pathname.startsWith("/find-therapist") ||
		pathname.startsWith("/sessions") ||
		pathname.startsWith("/connections") ||
		pathname.startsWith("/chat");

	if (session) {
		console.log(
			`[Proxy] path=${pathname} userId=${session.user.id} role=${session.user.role} isPostOnboarding=${isPostOnboarding}`,
		);
	}

	if (
		session &&
		!session.user?.role &&
		!pathname.startsWith("/onboarding") &&
		!isPostOnboarding
	) {
		console.log(`[Proxy] Redirecting to /onboarding because role is missing`);
		return NextResponse.redirect(new URL("/onboarding", request.url));
	}

	return NextResponse.next();
}

/**
 * Fetches the current session from the NestJS backend directly.
 * USES env.API_URL for server-side direct calls.
 */
async function getSession(request: NextRequest) {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 3000);
		const response = await fetch(`${env.API_URL}/api/auth/get-session`, {
			headers: {
				cookie: request.headers.get("cookie") ?? "",
			},
			signal: controller.signal,
		});
		clearTimeout(timeout);
		if (!response.ok) return null;
		return await response.json();
	} catch (error) {
		// Network error or timeout — API temporarily unreachable. Log and continue.
		const isAbort = error instanceof Error && error.name === "AbortError";
		console.warn(
			`[Proxy] Session fetch ${isAbort ? "timed out" : "failed"} — degrading gracefully:`,
			error instanceof Error ? error.message : error,
		);
		return null;
	}
}

export const config = {
	matcher: [
		// Skip Next.js internals and all static files
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API and tRPC routes
		"/(api|trpc)(.*)",
	],
};
