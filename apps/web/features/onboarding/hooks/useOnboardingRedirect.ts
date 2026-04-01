"use client"
import { useEffect, useState } from "react";

import { useRouter, usePathname } from "next/navigation";
import { checkOnboardingStatus } from "../../../app/onboarding/actions";

export function useOnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function check() {
      // Early exit if on recommendations, connections, or other "safe" paths
      const isPostOnboarding = 
        pathname.startsWith("/dashboard") || 
        pathname.startsWith("/connections") || 
        pathname.startsWith("/chat");
        
      if (isPostOnboarding) {
        setLoading(false);
        return;
      }

      try {
        const status = await checkOnboardingStatus();
        if (!isMounted) return;

        if ("error" in status) {
          setLoading(false);
          return;
        }

        if (status.complete) {
          const isTherapist = status.role === 'therapist';
          
          // If a therapist is on the dashboard, redirect them to connections
          if (isTherapist && pathname.startsWith("/dashboard")) {
            router.push("/connections");
            return;
          }

          // If they are on dashboard/connections, allow it
          if (pathname.startsWith("/dashboard") || pathname === "/connections") {
            setLoading(false);
            return;
          }

          // Redirect based on role when completing onboarding
          if (pathname.includes("/onboarding")) {
            router.push(isTherapist ? "/connections" : "/dashboard/find-therapist");
            return;
          }
          setLoading(false);
          return;
        }

        const targetPath = status.role 
          ? `/onboarding/${status.role}/step-${status.step}` 
          : "/onboarding";

        // Step Ranking for selective redirection (allow going back)
        const getRank = (p: string) => {
          if (p === "/chat") return 100;
          if (p.startsWith("/dashboard")) return 90;
          if (p.includes("step-4")) return 4;
          if (p.includes("step-3")) return 3;
          if (p.includes("step-2")) return 2;
          if (p === "/onboarding") return 1;
          return 0;
        };

        const currentRank = getRank(pathname);
        const targetRank = getRank(targetPath);

        // ONLY redirect if the user is trying to skip ahead (currentRank > targetRank)
        // AND handle the special case where they don't have a role yet
        if (!status.role && pathname !== "/onboarding" && !pathname.endsWith("/step-2")) {
          router.push("/onboarding");
        } else if (status.role && currentRank > targetRank) {
          console.log("[OnboardingRedirect] Redirecting as user is skipping ahead:", pathname, "->", targetPath);
          router.push(targetPath);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Onboarding redirect check failed:", error);
        if (isMounted) setLoading(false);
      }
    }

    check();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  return { loading };
}
