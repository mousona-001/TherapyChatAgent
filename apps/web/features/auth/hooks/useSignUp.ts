import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@/features/auth/api/client";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export function useSignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const validation = signUpSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await signUp.email({
        email,
        password,
        name: email.split("@")[0], // Default name from email, users will fill proper name in onboarding
      });

      if (signUpError) {
        setError(signUpError.message || "Failed to create account. Please try again.");
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

  const handleGoogleSignUp = async () => {
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy before continuing with Google.");
      return;
    }
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/onboarding",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign up with Google");
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    agreedToTerms,
    setAgreedToTerms,
    isLoading,
    error,
    handleSignUp,
    handleGoogleSignUp,
  };
}
