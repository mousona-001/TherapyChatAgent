import { createAuthClient } from "better-auth/react";
import { env } from "@/config/env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_BASE_URL,
});

export const {
  signIn,
  signUp,
  useSession,
  signOut
} = authClient;
