import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      emailVerified: Date | null
      provider?: string
    } & DefaultSession['user']
  }

  interface User {
    emailVerified: Date | null
  }
}