import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        // Protected routes
        const protectedPaths = [
          '/dashboard',
          '/resumes',
          '/applications',
          '/jobs',
          '/settings',
          '/api/resumes',
          '/api/applications',
          '/api/jobs',
          '/api/profile'
        ]

        const isProtectedPath = protectedPaths.some(path =>
          req.nextUrl.pathname.startsWith(path)
        )

        // Allow access to protected routes only if authenticated
        if (isProtectedPath) {
          return !!token
        }

        return true
      }
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error'
    }
  }
)

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/resumes/:path*',
    '/applications/:path*',
    '/jobs/:path*',
    '/settings/:path*',
    '/api/resumes/:path*',
    '/api/applications/:path*',
    '/api/jobs/:path*',
    '/api/profile/:path*'
  ]
}