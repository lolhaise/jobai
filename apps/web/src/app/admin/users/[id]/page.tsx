'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminGuard } from '@/components/admin/admin-guard'
import { AdminLayout } from '@/components/admin/admin-layout'
import { UserDetails } from '@/components/admin/users/user-details'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { UserRole, ApplicationStatus } from '@jobai/database'
import Link from 'next/link'

interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
  emailVerified: Date | null
  createdAt: string
  updatedAt: string
  image: string | null
  profile: {
    phone: string | null
    location: string | null
    linkedinUrl: string | null
    githubUrl: string | null
  } | null
  _count: {
    applications: number
    resumes: number
    savedJobs: number
    activities: number
  }
  applications: Array<{
    id: string
    status: ApplicationStatus
    appliedAt: Date | null
    job: {
      title: string
      company: string
    }
  }>
  activities: Array<{
    id: string
    type: string
    description: string
    createdAt: string
  }>
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUser()
  }, [params.id])

  async function fetchUser() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/users/${params.id}`)
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else if (response.status === 404) {
        setError('User not found')
      } else {
        throw new Error('Failed to fetch user')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setError('Failed to load user details')
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(updates: { role?: UserRole; emailVerified?: boolean }) {
    if (!user) return

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update user')
      }

      const updatedUser = await response.json()
      setUser({ ...user, ...updatedUser })

      toast({
        title: 'Success',
        description: 'User updated successfully',
      })
    } catch (error) {
      console.error('Error updating user:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      })
      throw error
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Link href="/admin/users">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading user details...</span>
              </div>
            </div>
            <div className="animate-pulse space-y-6">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
                <div className="h-48 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </AdminLayout>
      </AdminGuard>
    )
  }

  if (error || !user) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Link href="/admin/users">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Button>
              </Link>
            </div>
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <div className="text-center">
                  <h2 className="text-lg font-semibold mb-2">
                    {error === 'User not found' ? 'User Not Found' : 'Error Loading User'}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {error === 'User not found' 
                      ? 'The user you are looking for does not exist.'
                      : 'There was an error loading the user details.'
                    }
                  </p>
                  <div className="space-x-2">
                    <Button onClick={fetchUser} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Link href="/admin/users">
                      <Button variant="default">
                        Go Back to Users
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </AdminLayout>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/users">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
                <p className="text-gray-600">
                  Manage user account and view activity
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUser}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* User Details */}
          <UserDetails user={user} onUpdate={handleUpdate} />
        </div>
      </AdminLayout>
    </AdminGuard>
  )
}