import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Optional so `prisma generate` works in builds without a database
    // (Vercel Preview). Commands that connect still fail without it.
    url: process.env.DATABASE_URL,
  },
})
