import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_BASE_URL: z.string().min(1).default("http://localhost:3000"),
  NEXT_PUBLIC_API_URL: z.string().min(1).default("http://localhost:3001"),
  API_URL: z.string().min(1).default("http://localhost:3001"),
});

const _env = envSchema.safeParse({
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL,
  API_URL: process.env.API_URL,
});

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
