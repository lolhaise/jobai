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
import { Eye, EyeOff, Shield, Download, Trash2, Users, Globe } from 'lucide-react'

const privacySchema = z.object({
  profileVisibility: z.enum(['public', 'private', 'connections-only']),
  showEmail: z.boolean(),
  showLocation: z.boolean(),
  showSalaryExpectations: z.boolean(),
  showJobPreferences: z.boolean(),
  allowSearchEngineIndexing: z.boolean(),
  allowRecruiterContact: z.boolean(),
  allowDataAnalytics: z.boolean(),
  allowMarketingEmails: z.boolean(),
  allowJobAlerts: z.boolean(),
  dataRetentionPeriod: z.enum(['1-year', '2-years', '5-years', 'indefinite'])
})

type PrivacyData = z.infer<typeof privacySchema>

const visibilityOptions = [
  { 
    value: 'public', 
    label: 'Public', 
    description: 'Your profile is visible to everyone',
    icon: Globe 
  },
  { 
    value: 'connections-only', 
    label: 'Connections Only', 
    description: 'Only your connections can see your profile',
    icon: Users 
  },
  { 
    value: 'private', 
    label: 'Private', 
    description: 'Your profile is only visible to you',
    icon: EyeOff 
  }
]

const dataRetentionOptions = [
  { value: '1-year', label: '1 Year', description: 'Delete data after 1 year of inactivity' },
  { value: '2-years', label: '2 Years', description: 'Delete data after 2 years of inactivity' },
  { value: '5-years', label: '5 Years', description: 'Delete data after 5 years of inactivity' },
  { value: 'indefinite', label: 'Indefinite', description: 'Keep data until manually deleted' }
]

export default function PrivacyPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<PrivacyData>({
    resolver: zodResolver(privacySchema),
    defaultValues: {
      profileVisibility: 'public',
      showEmail: false,
      showLocation: true,
      showSalaryExpectations: false,
      showJobPreferences: true,
      allowSearchEngineIndexing: true,
      allowRecruiterContact: true,
      allowDataAnalytics: true,
      allowMarketingEmails: false,
      allowJobAlerts: true,
      dataRetentionPeriod: 'indefinite'
    }
  })

  useEffect(() => {
    if (session?.user) {
      loadPrivacySettings()
    }
  }, [session])

  const loadPrivacySettings = async () => {
    try {
      const data = await api.get('/api/privacy-settings')
      if (data) {
        reset(data)
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error)
    }
  }

  const onSubmit = async (data: PrivacyData) => {
    setIsLoading(true)
    try {
      await api.put('/api/privacy-settings', data)
      
      toast({
        title: 'Privacy settings updated',
        description: 'Your privacy preferences have been successfully saved.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update privacy settings. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadData = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch('/api/privacy/download-data', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.user?.id}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'my-data.json'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: 'Data downloaded',
          description: 'Your personal data has been downloaded successfully.'
        })
      } else {
        throw new Error('Failed to download data')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download data. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const deleteAllData = async () => {
    if (!confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      return
    }

    try {
      await api.post('/api/privacy/delete-all-data')
      
      toast({
        title: 'Data deletion initiated',
        description: 'Your data deletion request has been submitted. You will receive a confirmation email.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate data deletion. Please try again.',
        variant: 'destructive'
      })
    }
  }

  if (!session) {
    return <div>Loading...</div>
  }

  const watchedValues = watch()

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Visibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Profile Visibility
            </CardTitle>
            <CardDescription>
              Control who can see your profile and information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {visibilityOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <label key={option.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value={option.value}
                      {...register('profileVisibility')}
                      className="mr-3"
                    />
                    <IconComponent className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Information Visibility</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('showEmail')}
                    className="mr-3"
                  />
                  <span className="text-sm">Show email address on profile</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('showLocation')}
                    className="mr-3"
                  />
                  <span className="text-sm">Show location on profile</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('showSalaryExpectations')}
                    className="mr-3"
                  />
                  <span className="text-sm">Show salary expectations to recruiters</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('showJobPreferences')}
                    className="mr-3"
                  />
                  <span className="text-sm">Show job preferences to recruiters</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search & Discovery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Search & Discovery
            </CardTitle>
            <CardDescription>
              Control how you can be found and contacted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded-lg">
                <input
                  type="checkbox"
                  {...register('allowSearchEngineIndexing')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Search engine indexing</div>
                  <div className="text-sm text-gray-600">Allow search engines to index your profile</div>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg">
                <input
                  type="checkbox"
                  {...register('allowRecruiterContact')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Recruiter contact</div>
                  <div className="text-sm text-gray-600">Allow recruiters to contact you directly</div>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Data & Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Data Usage & Analytics
            </CardTitle>
            <CardDescription>
              Control how your data is used for analytics and marketing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded-lg">
                <input
                  type="checkbox"
                  {...register('allowDataAnalytics')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Analytics & Performance</div>
                  <div className="text-sm text-gray-600">Help us improve our service by analyzing usage patterns</div>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg">
                <input
                  type="checkbox"
                  {...register('allowMarketingEmails')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Marketing emails</div>
                  <div className="text-sm text-gray-600">Receive emails about new features and services</div>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg">
                <input
                  type="checkbox"
                  {...register('allowJobAlerts')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Job alerts</div>
                  <div className="text-sm text-gray-600">Receive personalized job recommendations</div>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
            <CardDescription>
              Choose how long we keep your data when you're inactive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {dataRetentionOptions.map((option) => (
                <label key={option.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value={option.value}
                    {...register('dataRetentionPeriod')}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} size="lg">
            {isLoading ? 'Saving...' : 'Save Privacy Settings'}
          </Button>
        </div>
      </form>

      {/* Data Management */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Data Rights</CardTitle>
          <CardDescription className="text-blue-700">
            Manage your personal data according to your rights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={downloadData}
              disabled={isDownloading}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download My Data'}
            </Button>
            <Button
              variant="destructive"
              onClick={deleteAllData}
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Data
            </Button>
          </div>
          <p className="text-sm text-blue-700">
            You have the right to download a copy of your personal data or request its deletion.
            Data deletion requests may take up to 30 days to process.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}