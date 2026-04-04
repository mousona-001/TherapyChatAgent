import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/features/auth/api/client";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export function useSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    try {
      const { error: signInError } = await signIn.email({
        email,
        password,
        rememberMe,
      });

      if (signInError) {
        setError(signInError.message || "Failed to sign in. Please check your credentials.");
      } else {
        router.push("/overview");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/overview",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    error,
    handleSignIn,
    handleGoogleSignIn,
  };
}
