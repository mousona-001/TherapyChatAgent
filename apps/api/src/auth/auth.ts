import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import type { BetterAuthPlugin } from 'better-auth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { openAPI } = require('better-auth/plugins') as { openAPI: () => BetterAuthPlugin };
import { db } from '../database/db';
import * as schema from '../database/schema';


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
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [openAPI()],
});
