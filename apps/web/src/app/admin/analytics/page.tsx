'use client'

import { useState, useEffect } from 'react'
import { AdminGuard } from '@/components/admin/admin-guard'
import { AdminLayout } from '@/components/admin/admin-layout'
import { StatsCards } from '@/components/admin/stats-cards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/admin'
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  FileText, 
  RefreshCw,
  BarChart3,
  PieChart,
  Calendar,
  Download
} from 'lucide-react'

interface AnalyticsData {
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
  trends: {
    userGrowthRate: number
    applicationGrowthRate: number
    conversionRate: number
    activeUserRate: number
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const analyticsData = await response.json()
        
        // Calculate some additional trends
        const trends = {
          userGrowthRate: calculateGrowthRate(analyticsData.overview.newUsersThisWeek, analyticsData.overview.totalUsers),
          applicationGrowthRate: calculateGrowthRate(analyticsData.overview.applicationsThisWeek, analyticsData.overview.totalApplications),
          conversionRate: calculateConversionRate(analyticsData.overview.totalApplications, analyticsData.overview.totalUsers),
          activeUserRate: calculateActiveRate(analyticsData.overview.activeUsers, analyticsData.overview.totalUsers),
        }
        
        setData({
          ...analyticsData,
          trends,
        })
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  function calculateGrowthRate(recent: number, total: number): number {
    if (total === 0) return 0
    return (recent / total) * 100
  }

  function calculateConversionRate(applications: number, users: number): number {
    if (users === 0) return 0
    return (applications / users) * 100
  }

  function calculateActiveRate(active: number, total: number): number {
    if (total === 0) return 0
    return (active / total) * 100
  }

  async function handleExportAnalytics() {
    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'json',
          type: 'analytics',
          dateRange: { from: '2024-01-01', to: new Date().toISOString() },
        }),
      })

      if (!response.ok) throw new Error('Failed to export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting analytics:', error)
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="animate-pulse space-y-6">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-96"></div>
              </div>
            </div>
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

  if (!data) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="text-center py-12">
            <p className="text-gray-500">Failed to load analytics data</p>
            <Button onClick={fetchAnalytics} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600">
                Comprehensive insights into your platform performance
              </p>
            </div>
            <div className="flex space-x-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportAnalytics}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={fetchAnalytics}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Overview Stats */}
          <StatsCards stats={data.overview} />

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Growth Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.trends.userGrowthRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">This week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Application Growth</CardTitle>
                <Briefcase className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.trends.applicationGrowthRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">This week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.trends.conversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Apps per user</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active User Rate</CardTitle>
                <Users className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.trends.activeUserRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Verified users</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Roles Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  User Roles Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.charts.userRoles.map((role, index) => {
                    const percentage = ((role.count / data.overview.totalUsers) * 100).toFixed(1)
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            role.role === 'ADMIN' ? 'bg-red-500' :
                            role.role === 'PREMIUM' ? 'bg-blue-500' : 'bg-gray-400'
                          }`}></div>
                          <span className="text-sm font-medium">{role.role}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{percentage}%</span>
                          <Badge variant="outline">{role.count}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Application Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Application Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.charts.applicationStatus.map((status, index) => {
                    const percentage = ((status.count / data.overview.totalApplications) * 100).toFixed(1)
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            status.status === 'OFFERED' ? 'bg-green-500' :
                            status.status === 'REJECTED' ? 'bg-red-500' :
                            status.status === 'IN_PROGRESS' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}></div>
                          <span className="text-sm font-medium">{status.status.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{percentage}%</span>
                          <Badge variant="outline">{status.count}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Companies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Top Companies by Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.charts.topCompanies.slice(0, 10).map((company, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{company.company}</span>
                    </div>
                    <Badge variant="secondary">{company.applicationCount} applications</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Platform Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">User Engagement</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• {data.overview.activeUsers} active users ({data.trends.activeUserRate.toFixed(1)}%)</li>
                    <li>• {data.overview.newUsersThisWeek} new users this week</li>
                    <li>• {data.overview.premiumUsers} premium subscribers</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Application Activity</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• {data.overview.applicationsThisWeek} applications this week</li>
                    <li>• {data.trends.conversionRate.toFixed(1)} avg applications per user</li>
                    <li>• {data.overview.totalJobs} total jobs available</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Growth Metrics</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• {data.trends.userGrowthRate.toFixed(1)}% user growth rate</li>
                    <li>• {data.trends.applicationGrowthRate.toFixed(1)}% application growth</li>
                    <li>• {data.overview.jobsThisWeek} new jobs this week</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AdminGuard>
  )
}