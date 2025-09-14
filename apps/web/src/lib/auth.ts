import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@jobai/database'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
    newUser: '/onboarding'
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials)
          
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              emailVerified: true,
              role: true,
              password: true
            }
          })
          
          if (!user || !user.password) {
            return null
          }
          
          const passwordMatch = await bcrypt.compare(password, user.password)
          
          if (!passwordMatch) {
            return null
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            emailVerified: user.emailVerified,
            role: user.role
          }
        } catch (error) {
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === 'update' && session) {
        token = { ...token, ...session }
      }
      
      if (user) {
        token.id = user.id
        token.emailVerified = user.emailVerified
        token.role = (user as any).role
      }
      
      // Always fetch fresh user data to ensure role is up to date
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true }
        })
        if (dbUser) {
          token.role = dbUser.role
        }
      }
      
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.provider = account.provider
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.emailVerified = token.emailVerified as Date | null
        session.user.provider = token.provider as string | undefined
        ;(session.user as any).role = token.role
      }
      
      return session
    },
    async signIn({ user, account, profile }) {
      // Allow OAuth sign in
      if (account?.type === 'oauth') {
        return true
      }
      
      // For credentials provider, check if email is verified
      if (account?.type === 'credentials') {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true }
        })
        
        // Allow sign in even if email not verified, but we'll handle it in the app
        return true
      }
      
      return true
    }
  },
  events: {
    async createUser({ user }) {
      // Create a profile for new users
      await prisma.profile.create({
        data: {
          userId: user.id!,
          bio: '',
          location: '',
          website: '',
          linkedin: '',
          github: ''
        }
      })
    }
  },
  debug: process.env.NODE_ENV === 'development'
}