"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { env } from "@/config/env";
import { parsePhoneNumberFromString } from "libphonenumber-js";

function isValidPhoneNumber(phone: string) {
  try {
    const phoneNumber = parsePhoneNumberFromString(phone);
    return phoneNumber?.isValid() || false;
  } catch {
    return false;
  }
}

function normalizePhoneNumber(phone: string) {
  try {
    const phoneNumber = parsePhoneNumberFromString(phone);
    return phoneNumber?.format("E.164") || phone;
  } catch {
    return phone;
  }
}

// ── Validation Schemas ──────────────────────────────────────────────────────

const patientSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  dateOfBirth: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    return arg;
  }, z.date({ required_error: "Required" }).refine((d) => !isNaN(d.getTime()), "Invalid date")),
  gender: z.string().min(1, "Required"),
  bio: z.string().optional(),
  phoneNumber: z.string().refine((val) => !val || isValidPhoneNumber(val), {
    message: "Invalid phone number",
  }),
});

const therapistSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  dateOfBirth: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    return arg;
  }, z.date({ required_error: "Required" }).refine((d) => !isNaN(d.getTime()), "Invalid date")),
  gender: z.string().min(1, "Required"),
  bio: z.string().optional(),
  phoneNumber: z.string().refine((val) => !val || isValidPhoneNumber(val), {
    message: "Invalid phone number",
  }),
  languages: z.array(z.string()).min(1, "Select at least one language"),
});

// ── Helper ──────────────────────────────────────────────────────────────────

async function getAuthHeaders() {
  const head = await headers();
  const filtered = new Headers();
  head.forEach((value, key) => {
    // We intentionally exclude content-type here and set it explicitly in the fetch call
    if (!["host", "connection", "content-length", "content-type"].includes(key.toLowerCase())) {
      filtered.set(key, value);
    }
  });
  return filtered;
}

async function handleResponse(response: Response, defaultError: string) {
  if (response.ok) {
    const text = await response.text();
    try {
      const data = text ? JSON.parse(text) : null;
      return { success: true, data };
    } catch {
      return { success: true, data: text };
    }
  }

  const errorText = await response.text();
  try {
    const errorJson = JSON.parse(errorText);
    if (Array.isArray(errorJson.message)) {
      return { error: errorJson.message.join(", ") };
    }
    return { error: errorJson.message || defaultError };
  } catch {
    return { error: errorText || defaultError };
  }
}

// ── Server Actions ──────────────────────────────────────────────────────────

export async function savePatientProfile(data: any) {
  const result = patientSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${env.API_URL}/api/profile/patient`, {
      method: "POST",
      headers: {
        ...Object.fromEntries(authHeaders.entries()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...result.data,
        phoneNumber: normalizePhoneNumber(result.data.phoneNumber),
        dateOfBirth: result.data.dateOfBirth.toISOString().split("T")[0],
      }),
    });

    return await handleResponse(response, "Failed to save patient profile");
  } catch (e) {
    return { error: "Network error. Please check your connection." };
  }
}

export async function saveTherapistProfile(data: any) {
  const result = therapistSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${env.API_URL}/api/profile/therapist`, {
      method: "POST",
      headers: {
        ...Object.fromEntries(authHeaders.entries()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...result.data,
        phoneNumber: normalizePhoneNumber(result.data.phoneNumber),
        dateOfBirth: result.data.dateOfBirth.toISOString().split("T")[0],
        languages: result.data.languages,
      }),
    });

    return await handleResponse(response, "Failed to save therapist profile");
  } catch (e) {
    return { error: "Network error. Please try again." };
  }
}

export async function sendOTP(phoneNumber: string) {
  console.log(`[AUTH] Sending OTP to: ${phoneNumber}`);
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${env.API_URL}/api/auth/phone-number/send-otp`, {
      method: "POST",
      headers: {
        ...Object.fromEntries(authHeaders.entries()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phoneNumber }),
    });

    return await handleResponse(response, "Failed to send OTP");

    console.log(`[AUTH] Successfully requested OTP for: ${phoneNumber}`);
    return { success: true };
  } catch (e) {
    console.error(`[AUTH] Network error sending OTP to ${phoneNumber}:`, e);
    return { error: "Network error. Please check your connection." };
  }
}

export async function verifyOTP(phoneNumber: string, code: string) {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${env.API_URL}/api/auth/phone-number/verify`, {
      method: "POST",
      headers: {
        ...Object.fromEntries(authHeaders.entries()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber,
        code,
        updatePhoneNumber: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        return { error: Array.isArray(errorJson.message) ? errorJson.message.join(", ") : errorJson.message || "Verification failed" };
      } catch {
        return { error: errorText || "Verification failed" };
      }
    }

    const data = await response.json().catch(() => ({}));
    if (!data.status && data.message) {
      return { error: data.message };
    }

    return { success: true };
  } catch (e) {
    return { error: "Network error. Please try again." };
  }
}

export async function updatePatientProfile(data: any) {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${env.API_URL}/api/profile/patient`, {
      method: "PATCH",
      headers: {
        ...Object.fromEntries(authHeaders.entries()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return await handleResponse(response, "Failed to update patient profile");
  } catch (e) {
    return { error: "Network error. Please try again." };
  }
}

export async function updateTherapistProfile(data: any) {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${env.API_URL}/api/profile/therapist`, {
      method: "PATCH",
      headers: {
        ...Object.fromEntries(authHeaders.entries()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return await handleResponse(response, "Failed to update therapist profile");
  } catch (e) {
    return { error: "Network error. Please try again." };
  }
}

export async function getProfile(role: "therapist" | "patient") {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${env.API_URL}/api/profile/me?role=${role}`, {
      method: "GET",
      headers: {
        ...Object.fromEntries(authHeaders.entries()),
      },
    });

    if (!response.ok) {
      if (response.status === 404) return { data: null };
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch profile" };
  }
}

export async function checkOnboardingStatus() {
  const [patientResult, therapistResult] = await Promise.all([
    getProfile("patient"),
    getProfile("therapist"),
  ]);

  if (patientResult.data) {
    const p = patientResult.data;
    // Step 2 is complete if profile exists (submitted in step 2)
    if (!p.reasonForSeeking) return { role: "patient", step: 3, userId: p.userId };
    if (!p.emergencyContactName) return { role: "patient", step: 4, userId: p.userId };
    return { role: "patient", complete: true, userId: p.userId };
  }

  if (therapistResult.data) {
    const t = therapistResult.data;
    // Step 2 is complete if profile exists
    if (!t.licenseNumber) return { role: "therapist", step: 3, userId: t.userId };
    if (!t.communicationStyle) return { role: "therapist", step: 4, userId: t.userId };
    return { role: "therapist", complete: true, userId: t.userId };
  }

  // ONLY if both failed to return data, check if there was a blocking fetch error
  if (patientResult.error || therapistResult.error) {
    return { error: true };
  }

  return { role: null, step: 1 };
}

export async function getTherapistRecommendations() {
  const authHeaders = await getAuthHeaders();
  
  try {
    // 1. Get the patient's profile to find their reason for seeking care
    const { data: profile } = await getProfile("patient");
    if (!profile) return { error: "Patient profile not found." };
    
    const query = profile.reasonForSeeking || "";
    
    // 2. Fetch recommendations from the API
    const response = await fetch(`${env.API_URL}/api/recommendations/therapists?q=${encodeURIComponent(query)}&limit=3`, {
      method: "GET",
      headers: {
        ...Object.fromEntries(authHeaders.entries()),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch matches. Please try again later.");
    }

    const data = await response.json();
    return { data };
  } catch (e) {
    console.error("Recommendations fetch failed:", e);
    return { error: e instanceof Error ? e.message : "Failed to fetch matches" };
  }
}

export async function getConnections(role: 'patient' | 'therapist' = 'patient') {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${env.API_URL}/api/connections?role=${role}`, {
      headers: { ...Object.fromEntries(authHeaders.entries()) },
    });
    return await handleResponse(response, "Failed to fetch connections");
  } catch (e) {
    return { error: "Network error" };
  }
}

export async function createConnection(therapistId: string) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${env.API_URL}/api/connections/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(authHeaders.entries()),
      },
      body: JSON.stringify({ therapistId }),
    });
    return await handleResponse(response, "Failed to request connection");
  } catch (e) {
    return { error: "Network error" };
  }
}

export async function getChatSessions() {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${env.API_URL}/api/chat/sessions`, {
      headers: { ...Object.fromEntries(authHeaders.entries()) },
    });
    return await handleResponse(response, "Failed to fetch chat sessions");
  } catch (e) {
    return { error: "Network error" };
  }
}

export async function getMessages(sessionId: string) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${env.API_URL}/api/chat/sessions/${sessionId}/messages`, {
      headers: { ...Object.fromEntries(authHeaders.entries()) },
    });
    return await handleResponse(response, "Failed to fetch messages");
  } catch (e) {
    return { error: "Network error" };
  }
}

export async function sendMessage(message: string, sessionId?: string) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${env.API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(authHeaders.entries()),
      },
      body: JSON.stringify({ message, sessionId }),
    });
    return await handleResponse(response, "Failed to send message");
  } catch (e) {
    return { error: "Network error" };
  }
}

export async function createChatSession(connectionId?: string) {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${env.API_URL}/api/chat/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(authHeaders.entries()),
      },
      body: JSON.stringify({ connectionId }),
    });
    return await handleResponse(response, "Failed to create chat session");
  } catch (e) {
    return { error: "Network error" };
  }
}

export async function getChatToken() {
  const authHeaders = await getAuthHeaders();
  try {
    // Try both roles to find the user's profile
    const [pResult, tResult] = await Promise.all([
      getProfile("patient"),
      getProfile("therapist")
    ]);
    
    // If BOTH failed with errors (excluding 404s which return {data: null}), return the error
    if (pResult.error && tResult.error) {
       return { error: `Profile fetch failed: ${pResult.error}` };
    }

    const profile = pResult.data || tResult.data;
    
    if (!profile) return { error: "User profile not found. Please complete onboarding." };
    
    const userId = profile.userId || profile.id;
    // Create a simple JWT-like token (header.payload.signature)
    const payload = Buffer.from(JSON.stringify({ sub: userId, userId })).toString('base64url');
    const token = `header.${payload}.signature`;
    
    return { success: true, data: { token } };
  } catch (e) {
    return { error: "Failed to generate chat token: Internal Error" };
  }
}

export async function respondToConnection(connectionId: string, status: 'accepted' | 'rejected') {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${env.API_URL}/api/connections/${connectionId}/respond`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(authHeaders.entries()),
      },
      body: JSON.stringify({ status }),
    });
    return await handleResponse(response, `Failed to ${status} connection`);
  } catch (e) {
    return { error: "Network error. Please try again." };
  }
}

export async function resetPhoneVerification() {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetch(`${env.API_URL}/api/profile/phone-verification/reset`, {
      method: "PATCH",
      headers: {
        ...Object.fromEntries(authHeaders.entries()),
      },
    });
    return await handleResponse(response, "Failed to reset phone verification");
  } catch (e) {
    return { error: "Network error. Please try again." };
  }
}
