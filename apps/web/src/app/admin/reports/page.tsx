'use client'

import { useState } from 'react'
import { AdminGuard } from '@/components/admin/admin-guard'
import { AdminLayout } from '@/components/admin/admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  Briefcase, 
  Activity,
  BarChart3
} from 'lucide-react'

const REPORT_TYPES = [
  {
    id: 'users',
    name: 'User Report',
    description: 'Export user data including registrations, roles, and activity',
    icon: Users,
  },
  {
    id: 'applications',
    name: 'Application Report',
    description: 'Export application data with job details and status',
    icon: Briefcase,
  },
  {
    id: 'activities',
    name: 'Activity Report',
    description: 'Export user activity logs and system events',
    icon: Activity,
  },
  {
    id: 'analytics',
    name: 'Analytics Report',
    description: 'Export platform statistics and performance metrics',
    icon: BarChart3,
  },
]

const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
]

const FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
]

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>('')
  const [format, setFormat] = useState('csv')
  const [dateRange, setDateRange] = useState('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [generating, setGenerating] = useState(false)

  async function generateReport() {
    if (!selectedReport) {
      toast({
        title: 'Error',
        description: 'Please select a report type',
        variant: 'destructive',
      })
      return
    }

    setGenerating(true)
    try {
      let dateFilter: any = {}
      
      if (dateRange === 'custom') {
        if (customStartDate) dateFilter.from = customStartDate
        if (customEndDate) dateFilter.to = customEndDate
      } else {
        const days = parseInt(dateRange.replace('d', ''))
        const fromDate = new Date()
        fromDate.setDate(fromDate.getDate() - days)
        dateFilter.from = fromDate.toISOString()
        dateFilter.to = new Date().toISOString()
      }

      const payload = {
        format,
        type: selectedReport,
        ...(Object.keys(dateFilter).length > 0 && { dateRange: dateFilter }),
      }

      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to generate report')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const reportName = REPORT_TYPES.find(r => r.id === selectedReport)?.name || 'report'
      const timestamp = new Date().toISOString().split('T')[0]
      a.download = `${reportName.toLowerCase().replace(' ', '-')}-${timestamp}.${format}`
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Success',
        description: 'Report generated and downloaded successfully',
      })
    } catch (error) {
      console.error('Error generating report:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600">
              Generate and export comprehensive reports on platform data
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Selection */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Select Report Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {REPORT_TYPES.map((report) => {
                    const Icon = report.icon
                    return (
                      <div
                        key={report.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedReport === report.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedReport(report.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{report.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Report Configuration */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Report Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label htmlFor="dateRange">Date Range</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_RANGES.map((range) => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Range */}
                  {dateRange === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Format */}
                  <div className="space-y-2">
                    <Label htmlFor="format">Export Format</Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMATS.map((fmt) => (
                          <SelectItem key={fmt.value} value={fmt.value}>
                            {fmt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Generate Button */}
                  <div className="pt-4">
                    <Button 
                      onClick={generateReport} 
                      disabled={!selectedReport || generating}
                      className="w-full"
                    >
                      {generating ? (
                        <>
                          <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating Report...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Generate & Download Report
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Report Preview */}
              {selectedReport && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Report Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const report = REPORT_TYPES.find(r => r.id === selectedReport)
                      if (!report) return null

                      return (
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{report.name}</h3>
                            <p className="text-sm text-gray-600">{report.description}</p>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">This report will include:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {selectedReport === 'users' && (
                                <>
                                  <li>• User ID, name, email, and registration date</li>
                                  <li>• User role and account status</li>
                                  <li>• Application and resume counts</li>
                                  <li>• Last activity date</li>
                                </>
                              )}
                              {selectedReport === 'applications' && (
                                <>
                                  <li>• Application details and status</li>
                                  <li>• Job title, company, and location</li>
                                  <li>• Application and submission dates</li>
                                  <li>• User information</li>
                                </>
                              )}
                              {selectedReport === 'activities' && (
                                <>
                                  <li>• User activity type and description</li>
                                  <li>• Activity timestamps</li>
                                  <li>• User identification</li>
                                  <li>• Activity metadata</li>
                                </>
                              )}
                              {selectedReport === 'analytics' && (
                                <>
                                  <li>• Platform statistics and metrics</li>
                                  <li>• User growth and engagement data</li>
                                  <li>• Application trends</li>
                                  <li>• Performance indicators</li>
                                </>
                              )}
                            </ul>
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>Format: {format.toUpperCase()}</span>
                            <span>
                              Date range: {dateRange === 'custom' 
                                ? `${customStartDate || 'Start'} to ${customEndDate || 'End'}`
                                : DATE_RANGES.find(r => r.value === dateRange)?.label
                              }
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  )
}