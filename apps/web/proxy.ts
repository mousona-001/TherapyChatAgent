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
export default async function proxy(request: NextRequest) {
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
  const isProtectedRoute = pathname.startsWith("/app") || pathname.startsWith("/onboarding");

  const sessionCookie = getSessionCookie(request);

  // 2. Public routes — always accessible
  if (isPublicRoute && !isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  // 3. Check session if we have a cookie or are accessing protected routes
  let session: Session | null = null;
  if (sessionCookie || isProtectedRoute || isAuthRoute) {
    session = await getSession(request);
  }

  // 4. Protected routes — require a valid session
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/signin", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 5. Auth routes — redirect to dashboard if already logged in
  if (isAuthRoute && session) {
    const role = session.user?.role;
    if (!role) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    const homePath = role === "patient" ? "/app/patient/home" : "/app/therapist/home";
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  // 6. Role protection — if session exists but no role, must go to onboarding
  // We allow /recommendations, /connections, and /chat as they are the final stages where the role might not have synced yet
  const isPostOnboarding = 
    pathname === "/recommendations" || 
    pathname === "/connections" || 
    pathname.startsWith("/chat");

  if (session) {
    console.log(`[Proxy] path=${pathname} userId=${session.user.id} role=${session.user.role} isPostOnboarding=${isPostOnboarding}`);
  }

  if (session && !session.user?.role && !pathname.startsWith("/onboarding") && !isPostOnboarding) {
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
    const response = await fetch(`${env.API_URL}/api/auth/get-session`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch session in proxy:", error);
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
