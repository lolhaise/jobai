'use client'

import { useAdmin } from '@/hooks/use-admin'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, AlertCircle } from 'lucide-react'

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin, isLoading, session } = useAdmin()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/auth/signin')
    } else if (!isLoading && session && !isAdmin) {
      router.push('/dashboard')
    }
  }, [isAdmin, isLoading, session, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Shield className="h-12 w-12 text-red-600 animate-pulse mb-4" />
            <p className="text-sm text-gray-600">Verifying admin access...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-12 w-12 text-yellow-600 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
            <p className="text-sm text-gray-600 text-center">
              You need to be signed in to access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-sm text-gray-600 text-center">
              You don't have permission to access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}