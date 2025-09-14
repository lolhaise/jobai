'use client'

import { useState } from 'react'
import { AdminGuard } from '@/components/admin/admin-guard'
import { AdminLayout } from '@/components/admin/admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { 
  Settings, 
  Database, 
  Mail, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Info,
  Bell
} from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)

  async function handleTestEmail() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
      })
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Test email sent successfully',
        })
      } else {
        throw new Error('Failed to send test email')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test email',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const systemInfo = {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected',
    cache: 'Redis (Connected)',
    storage: 'Local/S3',
    email: 'SMTP Configured',
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">
              Manage system configuration and administrative settings
            </p>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Platform Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="platformName">Platform Name</Label>
                      <Input id="platformName" defaultValue="JobAI" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supportEmail">Support Email</Label>
                      <Input id="supportEmail" type="email" defaultValue="support@jobai.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxUsers">Max Users (0 = unlimited)</Label>
                      <Input id="maxUsers" type="number" defaultValue="0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registrationEnabled">Registration</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant="success">Enabled</Badge>
                        <Button variant="outline" size="sm">Toggle</Button>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button>Save General Settings</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Admin Notifications</h4>
                      <p className="text-sm text-gray-600">Receive notifications for admin events</p>
                    </div>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">User Registration Alerts</h4>
                      <p className="text-sm text-gray-600">Get notified when new users register</p>
                    </div>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">System Health Alerts</h4>
                      <p className="text-sm text-gray-600">Receive alerts for system issues</p>
                    </div>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Settings */}
            <TabsContent value="email" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    SMTP Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        SMTP is properly configured and working
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP Host</Label>
                      <Input id="smtpHost" defaultValue="smtp.gmail.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP Port</Label>
                      <Input id="smtpPort" type="number" defaultValue="587" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">SMTP Username</Label>
                      <Input id="smtpUser" type="email" defaultValue="noreply@jobai.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpSecure">Security</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">TLS</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button>Save Email Settings</Button>
                    <Button 
                      variant="outline" 
                      onClick={handleTestEmail}
                      disabled={loading}
                    >
                      {loading ? 'Sending...' : 'Send Test Email'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Welcome Email</h4>
                      <p className="text-sm text-gray-600">Sent to new users after registration</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Password Reset</h4>
                      <p className="text-sm text-gray-600">Sent when users request password reset</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Job Alert</h4>
                      <p className="text-sm text-gray-600">Sent for job recommendations</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Input id="sessionTimeout" type="number" defaultValue="1440" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                      <Input id="maxLoginAttempts" type="number" defaultValue="5" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passwordMinLength">Min Password Length</Label>
                      <Input id="passwordMinLength" type="number" defaultValue="8" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requireEmailVerification">Email Verification</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant="success">Required</Badge>
                        <Button variant="outline" size="sm">Toggle</Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-600">Require 2FA for admin accounts</p>
                      </div>
                      <Badge variant="warning">Coming Soon</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">API Rate Limiting</h4>
                        <p className="text-sm text-gray-600">Limit API requests per IP</p>
                      </div>
                      <Badge variant="success">Enabled</Badge>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button>Save Security Settings</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                    Security Audit Log
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">SSL Certificate valid</span>
                      </div>
                      <span className="text-xs text-gray-500">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Database backup completed</span>
                      </div>
                      <span className="text-xs text-gray-500">6 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Rate limit exceeded from IP 192.168.1.1</span>
                      </div>
                      <span className="text-xs text-gray-500">1 day ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings */}
            <TabsContent value="system" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(systemInfo).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <Badge variant={key === 'environment' && value === 'development' ? 'warning' : 'success'}>
                          {value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Maintenance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="justify-start">
                      <Database className="h-4 w-4 mr-2" />
                      Database Backup
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Rebuild Search Index
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Info className="h-4 w-4 mr-2" />
                      System Health Check
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-red-800">Reset All Data</h4>
                        <p className="text-sm text-red-700 mt-1">
                          This action will permanently delete all user data, applications, and system logs. 
                          This action cannot be undone.
                        </p>
                        <Button variant="destructive" size="sm" className="mt-3" disabled>
                          Reset System Data
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminGuard>
  )
}