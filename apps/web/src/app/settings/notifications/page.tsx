'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { Bell, Mail, MessageSquare, Briefcase, AlertCircle, Settings } from 'lucide-react'

const notificationsSchema = z.object({
  // Email notifications
  emailJobAlerts: z.boolean(),
  emailApplicationUpdates: z.boolean(),
  emailInterviewReminders: z.boolean(),
  emailWeeklyDigest: z.boolean(),
  emailSecurityAlerts: z.boolean(),
  emailAccountUpdates: z.boolean(),
  emailMarketing: z.boolean(),
  
  // Push notifications
  pushJobAlerts: z.boolean(),
  pushApplicationUpdates: z.boolean(),
  pushInterviewReminders: z.boolean(),
  pushMessages: z.boolean(),
  pushSecurityAlerts: z.boolean(),
  
  // Job alert preferences
  alertFrequency: z.enum(['immediate', 'daily', 'weekly', 'never']),
  alertDistance: z.number().min(0).max(500),
  alertSalaryThreshold: z.number().min(0).optional(),
  alertOnlyRemote: z.boolean(),
  alertOnlyFullTime: z.boolean(),
  
  // Digest preferences
  weeklyDigestDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  digestIncludeJobStats: z.boolean(),
  digestIncludeMarketTrends: z.boolean(),
  digestIncludeTips: z.boolean(),
  
  // Quiet hours
  enableQuietHours: z.boolean(),
  quietHoursStart: z.string(),
  quietHoursEnd: z.string(),
  quietHoursTimezone: z.string()
})

type NotificationsData = z.infer<typeof notificationsSchema>

const alertFrequencyOptions = [
  { value: 'immediate', label: 'Immediately', description: 'Get notified as soon as jobs match your preferences' },
  { value: 'daily', label: 'Daily', description: 'Receive a daily summary of new job matches' },
  { value: 'weekly', label: 'Weekly', description: 'Get a weekly digest of job opportunities' },
  { value: 'never', label: 'Never', description: 'Disable job alert notifications' }
]

const weekdays = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
]

export default function NotificationsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [testingNotifications, setTestingNotifications] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<NotificationsData>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      // Email defaults
      emailJobAlerts: true,
      emailApplicationUpdates: true,
      emailInterviewReminders: true,
      emailWeeklyDigest: true,
      emailSecurityAlerts: true,
      emailAccountUpdates: true,
      emailMarketing: false,
      
      // Push defaults
      pushJobAlerts: true,
      pushApplicationUpdates: true,
      pushInterviewReminders: true,
      pushMessages: true,
      pushSecurityAlerts: true,
      
      // Job alert defaults
      alertFrequency: 'daily',
      alertDistance: 50,
      alertOnlyRemote: false,
      alertOnlyFullTime: false,
      
      // Digest defaults
      weeklyDigestDay: 'monday',
      digestIncludeJobStats: true,
      digestIncludeMarketTrends: true,
      digestIncludeTips: true,
      
      // Quiet hours defaults
      enableQuietHours: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      quietHoursTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  })

  useEffect(() => {
    if (session?.user) {
      loadNotificationSettings()
    }
  }, [session])

  const loadNotificationSettings = async () => {
    try {
      const data = await api.get('/api/notification-settings')
      if (data) {
        reset(data)
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error)
    }
  }

  const onSubmit = async (data: NotificationsData) => {
    setIsLoading(true)
    try {
      await api.put('/api/notification-settings', data)
      
      toast({
        title: 'Notification settings updated',
        description: 'Your notification preferences have been successfully saved.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testNotifications = async () => {
    setTestingNotifications(true)
    try {
      await api.post('/api/notifications/test')
      
      toast({
        title: 'Test notification sent',
        description: 'Check your email and browser notifications.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test notification. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setTestingNotifications(false)
    }
  }

  if (!session) {
    return <div>Loading...</div>
  }

  const watchedValues = watch()

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Choose which email notifications you'd like to receive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <Briefcase className="h-5 w-5 mr-3 text-blue-500" />
                  <div>
                    <div className="font-medium">Job Alerts</div>
                    <div className="text-sm text-gray-600">New jobs that match your preferences</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  {...register('emailJobAlerts')}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-3 text-green-500" />
                  <div>
                    <div className="font-medium">Application Updates</div>
                    <div className="text-sm text-gray-600">Status changes on your job applications</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  {...register('emailApplicationUpdates')}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <Bell className="h-5 w-5 mr-3 text-purple-500" />
                  <div>
                    <div className="font-medium">Interview Reminders</div>
                    <div className="text-sm text-gray-600">Reminders for upcoming interviews</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  {...register('emailInterviewReminders')}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <Settings className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <div className="font-medium">Weekly Digest</div>
                    <div className="text-sm text-gray-600">Weekly summary of your job search activity</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  {...register('emailWeeklyDigest')}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-3 text-red-500" />
                  <div>
                    <div className="font-medium">Security Alerts</div>
                    <div className="text-sm text-gray-600">Important security notifications</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  {...register('emailSecurityAlerts')}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <Settings className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <div className="font-medium">Account Updates</div>
                    <div className="text-sm text-gray-600">Changes to your account settings</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  {...register('emailAccountUpdates')}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-3 text-orange-500" />
                  <div>
                    <div className="font-medium">Marketing & Tips</div>
                    <div className="text-sm text-gray-600">Career tips and product updates</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  {...register('emailMarketing')}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Configure browser and mobile push notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Job Alerts</div>
                  <div className="text-sm text-gray-600">Immediate notifications for new job matches</div>
                </div>
                <input
                  type="checkbox"
                  {...register('pushJobAlerts')}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Application Updates</div>
                  <div className="text-sm text-gray-600">Status changes on your applications</div>
                </div>
                <input
                  type="checkbox"
                  {...register('pushApplicationUpdates')}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Interview Reminders</div>
                  <div className="text-sm text-gray-600">Push reminders for interviews</div>
                </div>
                <input
                  type="checkbox"
                  {...register('pushInterviewReminders')}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Messages</div>
                  <div className="text-sm text-gray-600">New messages from recruiters</div>
                </div>
                <input
                  type="checkbox"
                  {...register('pushMessages')}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Security Alerts</div>
                  <div className="text-sm text-gray-600">Critical security notifications</div>
                </div>
                <input
                  type="checkbox"
                  {...register('pushSecurityAlerts')}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Job Alert Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Job Alert Preferences</CardTitle>
            <CardDescription>
              Customize how and when you receive job alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Alert Frequency
              </label>
              <div className="space-y-2">
                {alertFrequencyOptions.map((option) => (
                  <label key={option.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value={option.value}
                      {...register('alertFrequency')}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Distance (miles)
                </label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  {...register('alertDistance', { valueAsNumber: true })}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>0</span>
                  <span>{watchedValues.alertDistance} miles</span>
                  <span>500</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Salary ($)
                </label>
                <input
                  type="number"
                  placeholder="50000"
                  {...register('alertSalaryThreshold', { valueAsNumber: true })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('alertOnlyRemote')}
                  className="mr-2"
                />
                <span className="text-sm">Only remote job opportunities</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('alertOnlyFullTime')}
                  className="mr-2"
                />
                <span className="text-sm">Only full-time positions</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Digest */}
        {watchedValues.emailWeeklyDigest && (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Digest Settings</CardTitle>
              <CardDescription>
                Customize your weekly digest preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Day
                </label>
                <select
                  {...register('weeklyDigestDay')}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {weekdays.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Include in Digest
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('digestIncludeJobStats')}
                      className="mr-2"
                    />
                    <span className="text-sm">Job application statistics</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('digestIncludeMarketTrends')}
                      className="mr-2"
                    />
                    <span className="text-sm">Job market trends</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('digestIncludeTips')}
                      className="mr-2"
                    />
                    <span className="text-sm">Career tips and advice</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Quiet Hours</CardTitle>
            <CardDescription>
              Set time periods when you don't want to receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('enableQuietHours')}
                className="mr-2"
              />
              <span className="text-sm font-medium">Enable quiet hours</span>
            </label>

            {watchedValues.enableQuietHours && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    {...register('quietHoursStart')}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    {...register('quietHoursEnd')}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={testNotifications}
            disabled={testingNotifications}
          >
            {testingNotifications ? 'Sending...' : 'Test Notifications'}
          </Button>
          <Button type="submit" disabled={isLoading} size="lg">
            {isLoading ? 'Saving...' : 'Save Notification Settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}