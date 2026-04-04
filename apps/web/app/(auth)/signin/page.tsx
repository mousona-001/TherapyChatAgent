"use client"
import React from "react";
import Link from "next/link";
import { Button, Checkbox } from "@repo/ui";
import {
  AuthLayout,
  AuthCard,
  InputWrapper,
  GoogleButton,
  OrSeparator,
  useSignIn
} from "@/features/auth";
import { ArrowRight, EnvelopeSimple } from "@phosphor-icons/react";

export default function SignInPage() {
  const {
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
  } = useSignIn();

  return (
    <AuthLayout>
      <form onSubmit={handleSignIn} className="w-full">
        <AuthCard
          label="Welcome back"
          headline={
            <>
              Good to see
              <br />
              you again.
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between w-full mt-1">
              <label className="flex items-center gap-[0.6rem] cursor-pointer">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="w-[18px] h-[18px] rounded-sm bg-surface-container-low border-2 border-surface-container data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white [&_svg]:stroke-[3px] [&_svg]:w-3.5 [&_svg]:h-3.5"
                />
                <span className="text-[0.8rem] font-semibold text-on-surface-variant">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-[0.8rem] font-bold text-primary bg-none border-none cursor-pointer font-sans transition-opacity hover:opacity-70"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 font-sans !text-[0.88rem] !font-bold text-on-primary bg-primary border-none rounded-sm py-3 !h-auto transition-all hover:bg-primary/90 hover:shadow-[0_4px_16px_-4px_rgba(73,75,214,0.35)] disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign in"}
              {!isLoading && <ArrowRight weight="bold" />}
            </Button>

            <OrSeparator />

            <GoogleButton onClick={handleGoogleSignIn} label="Sign in with Google" />
          </div>
        </AuthCard>
      </form>

      <p className="text-[0.8rem] text-on-surface-variant text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary font-bold no-underline hover:underline">
          Create one now
        </Link>
      </p>
    </AuthLayout>
  );
}
