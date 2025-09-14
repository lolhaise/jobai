'use client'

import { useEffect, useState } from 'react'
import { AdminGuard } from '@/components/admin/admin-guard'
import { AdminLayout } from '@/components/admin/admin-layout'
import { StatsCards } from '@/components/admin/stats-cards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/admin'
import { Activity, TrendingUp, Users, Briefcase } from 'lucide-react'

interface AdminStats {
  overview: {
    totalUsers: number
    activeUsers: number
    pendingUsers: number
    premiumUsers: number
    adminUsers: number
    newUsersThisWeek: number
    newUsersToday: number
    totalApplications: number
    applicationsThisWeek: number
    applicationsToday: number
    totalJobs: number
    activeJobs: number
    jobsThisWeek: number
  }
  charts: {
    userGrowth: Array<{ date: string; count: number }>
    applicationStatus: Array<{ status: string; count: number }>
    userRoles: Array<{ role: string; count: number }>
    topCompanies: Array<{ company: string; applicationCount: number }>
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </AdminLayout>
      </AdminGuard>
    )
  }

  if (!stats) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="text-center py-12">
            <p className="text-gray-500">Failed to load dashboard data</p>
          </div>
        </AdminLayout>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Overview of your platform metrics</p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {formatDate(new Date())}
            </div>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={stats.overview} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>User Growth Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.charts.userGrowth.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      Last 7 days: +{stats.overview.newUsersThisWeek} users
                    </div>
                    <div className="text-sm text-gray-600">
                      Today: +{stats.overview.newUsersToday} users
                    </div>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">
                        Chart visualization would go here in a production app
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No growth data available</p>
                )}
              </CardContent>
            </Card>

            {/* User Roles Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Roles</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.charts.userRoles.map((role, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant={role.role === 'ADMIN' ? 'destructive' : role.role === 'PREMIUM' ? 'default' : 'secondary'}>
                          {role.role}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium">{role.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Application Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5" />
                  <span>Application Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.charts.applicationStatus.map((status, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={
                            status.status === 'OFFERED' ? 'success' :
                            status.status === 'REJECTED' ? 'destructive' :
                            status.status === 'IN_PROGRESS' ? 'warning' :
                            'secondary'
                          }
                        >
                          {status.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium">{status.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Companies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Top Companies</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.charts.topCompanies.slice(0, 5).map((company, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium">{company.company}</span>
                      </div>
                      <Badge variant="outline">{company.applicationCount}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  )
}