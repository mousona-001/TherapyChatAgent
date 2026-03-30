"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Phone, ArrowClockwise } from "@phosphor-icons/react";
import { PhoneInput, isValidPhoneNumber, Input, toast, Button } from "@repo/ui";

import { sendOTP, verifyOTP } from "../../../app/onboarding/actions";

interface PhoneVerificationProps {
  initialPhoneNumber?: string;
  initialIsVerified?: boolean;
  onVerified?: (phoneNumber: string, isVerified: boolean) => void;
}

export function PhoneVerification({ 
  initialPhoneNumber = "", 
  initialIsVerified = false,
  onVerified 
}: PhoneVerificationProps) {
  const [phone, setPhone] = useState(initialPhoneNumber);
  const [isSent, setIsSent] = useState(false);
  const [isVerified, setIsVerified] = useState(initialIsVerified);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  // If initialPhoneNumber changes (from sync), update local phone state
  useEffect(() => {
    if (initialPhoneNumber) setPhone(initialPhoneNumber);
  }, [initialPhoneNumber]);

  // If phone changes and it's not the initial verified number, reset verification
  useEffect(() => {
    if (initialIsVerified && phone !== initialPhoneNumber && initialPhoneNumber !== "") {
      setIsVerified(false);
      onVerified?.(phone, false);
    } else if (phone === initialPhoneNumber && initialIsVerified) {
      setIsVerified(true);
      onVerified?.(phone, true);
    }
  }, [phone, initialPhoneNumber, initialIsVerified, onVerified]);
  const [status, setStatus] = useState<"idle" | "sending" | "verifying" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSend = async () => {
    if (!phone || !isValidPhoneNumber(phone)) {
      setErrorMsg("Please enter a valid phone number");
      return;
    }
    if (isVerified) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const result = await sendOTP(phone) as any;
      if (result.error) throw new Error(result.error);
      setIsSent(true);
      setStatus("idle");
      toast.success("Verification code sent!");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send OTP";
      setErrorMsg(msg);
      setStatus("error");
      toast.error(msg);
    }
  };

  const handleResend = async () => {
    setOtp(["", "", "", "", "", ""]);
    setIsSent(false);
    await handleSend();
  };

  const handleOtpChange = async (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (newOtp.every((digit) => digit !== "") && newOtp.join("").length === 6) {
      const code = newOtp.join("");
      setStatus("verifying");
      setErrorMsg("");
      try {
        const result = await verifyOTP(phone, code) as any;
        if (result.error) throw new Error(result.error);
        setStatus("idle");
        setIsVerified(true);
        toast.success("Phone number verified successfully!");
        if (onVerified) onVerified(phone, true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Verification failed";
        setErrorMsg(msg);
        setStatus("error");
        toast.error(msg);
        // Clear OTP on failure
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="w-full flex flex-col gap-[1.25rem]">
      {/* Phone Input */}
      <div className="flex flex-col gap-[0.45rem]">
        <label className="text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)]">
          Mobile number
        </label>
        <div className="flex gap-2">
          <PhoneInput
            value={phone}
            onChange={(val) => {
              setPhone(val);
              if (val !== initialPhoneNumber || !initialIsVerified) {
                setIsVerified(false);
                if (onVerified) onVerified(val, false);
              } else {
                setIsVerified(true);
                if (onVerified) onVerified(val, true);
              }
            }}
            disabled={isSent || isVerified}
            placeholder="e.g. 98765 43210"
            defaultCountry="IN"
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isSent || isVerified || !phone || !isValidPhoneNumber(phone) || status === "sending"}
            className="shrink-0 px-6 h-[52px] !bg-[var(--primary-container)] !text-[var(--primary)] text-[0.85rem] font-bold rounded-[var(--r-sm)] border-none shadow-none hover:opacity-80 active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            {status === "sending" ? "Sending…" : isVerified ? "Verified ✓" : isSent ? "Sent ✓" : "Send Code"}
          </Button>
        </div>
      </div>

      {/* OTP Section */}
      {isSent && (
        <div className="flex flex-col gap-[0.45rem] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <label className="text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--on-surface-variant)]">
            Verification code
          </label>
          <div className="grid grid-cols-6 gap-2">
            {otp.map((digit, i) => (
              <Input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={status === "verifying"}
                className="w-full h-12 text-center text-[1.1rem] font-bold"
              />
            ))}
          </div>

          {status === "verifying" && (
            <p className="text-[0.75rem] text-[var(--primary)] animate-pulse">Verifying…</p>
          )}

          {errorMsg && (
            <p className="text-[0.75rem] text-red-500">{errorMsg}</p>
          )}

          <div className="flex items-center justify-between mt-1">
            <span className="text-[0.75rem] text-[var(--on-surface-variant)]">
              Code sent to {phone}
            </span>
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={status === "sending" || status === "verifying"}
              className="flex items-center gap-1 h-auto p-0 text-[0.75rem] font-bold text-[var(--primary)] hover:bg-transparent hover:opacity-70 transition-opacity disabled:opacity-50"
            >
              <ArrowClockwise weight="bold" /> Resend SMS
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
