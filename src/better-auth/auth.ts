import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, jwt } from 'better-auth/plugins';
import { db } from '~/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),

  plugins: [
    jwt({
      jwt: {
        expirationTime: '3y',
      },

      jwks: {
        // default
        keyPairConfig: { alg: 'EdDSA', crv: 'Ed25519' },
      },
    }),

    bearer(),
  ],

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
});
