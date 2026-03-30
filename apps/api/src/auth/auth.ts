import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import type { BetterAuthPlugin } from 'better-auth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { openAPI } = require('better-auth/plugins') as { openAPI: () => BetterAuthPlugin };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { phoneNumber } = require('better-auth/plugins') as { phoneNumber: (opts?: unknown) => BetterAuthPlugin };
import twilio from 'twilio';
import { db } from '../database/db';
import * as schema from '../database/schema';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [
    process.env.FRONTEND_URL ?? 'http://localhost:3000',
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [])
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [
    openAPI(),
    phoneNumber({
      sendOTP: async ({ phoneNumber: to, code }: { phoneNumber: string; code: string }) => {
        await twilioClient.messages.create({
          to,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: `Your Sama verification code is: ${code}. Valid for 10 minutes.`,
        });
      },
      otpLength: 6,
      expiresIn: 600, // 10 minutes
    }),
  ],
});
