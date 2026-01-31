import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { anonymous } from 'better-auth/plugins'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@/db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (in seconds)
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
  plugins: [
    tanstackStartCookies(),
    anonymous({
      emailDomainName: 'vibestar.local',
    }),
  ],
})
