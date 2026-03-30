"use client";

import React from "react";
import Link from "next/link";
import { Button, Checkbox } from "@repo/ui";
import {
  AuthLayout,
  AuthCard,
  InputWrapper,
  GoogleButton,
  OrSeparator,
  useSignUp
} from "@/features/auth";
import { ArrowRight, EnvelopeSimple } from "@phosphor-icons/react";

export default function SignUpPage() {
  const {
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
  } = useSignUp();

  return (
    <AuthLayout>
      <form onSubmit={handleSignUp} className="w-full">
        <AuthCard
          label="Create your account"
          headline={
            <>
              Begin your journey
              <br />
              to better health.
            </>
          }
        >
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-[1.25rem]">
            <InputWrapper
              label="Email address"
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<EnvelopeSimple weight="bold" />}
            />

            <InputWrapper
              label="Password"
              id="password"
              isPassword
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label className="flex items-start gap-[0.75rem] w-full px-[0.15rem] cursor-pointer mt-1">
              <Checkbox
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="w-[18px] h-[18px] rounded-sm bg-surface-container-low border-2 border-surface-container data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white [&_svg]:stroke-[3px] [&_svg]:w-3.5 [&_svg]:h-3.5 shrink-0 mt-[0.1rem]"
              />
              <span className="text-[0.78rem] text-on-surface-variant leading-[1.6]">
                I agree to Sama&apos;s{" "}
                <Link href="#" className="text-primary font-bold no-underline hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-primary font-bold no-underline hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <Button
              type="submit"
              disabled={isLoading || !agreedToTerms}
              className="w-full flex items-center justify-center gap-2 font-sans !text-[0.88rem] !font-bold text-on-primary bg-primary border-none rounded-sm py-3 !h-auto transition-all hover:bg-primary/90 hover:shadow-[0_4px_16px_-4px_rgba(73,75,214,0.35)] disabled:opacity-50"
            >
              {isLoading ? "Creating account..." : "Begin your journey"}
              {!isLoading && <ArrowRight weight="bold" />}
            </Button>

            <OrSeparator />

            <GoogleButton onClick={handleGoogleSignUp} label="Sign up with Google" />
          </div>
        </AuthCard>
      </form>

      <p className="text-[0.8rem] text-on-surface-variant text-center mt-2">
        Already have an account?{" "}
        <Link href="/signin" className="text-primary font-bold no-underline hover:underline">
          Sign in instead
        </Link>
      </p>
    </AuthLayout>
  );
}
