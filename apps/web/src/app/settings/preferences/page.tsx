'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { MapPin, Briefcase, DollarSign, Clock, Plus, X } from 'lucide-react'
import * as Select from '@radix-ui/react-select'

const jobPreferencesSchema = z.object({
  desiredRoles: z.array(z.string()).min(1, 'At least one role is required'),
  experienceLevel: z.enum(['entry', 'junior', 'mid', 'senior', 'lead', 'executive']),
  employmentTypes: z.array(z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship'])).min(1),
  workLocations: z.array(z.string()).min(1, 'At least one location is required'),
  remoteWork: z.enum(['no', 'hybrid', 'full']),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  currency: z.string().default('USD'),
  skills: z.array(z.string()),
  industries: z.array(z.string()),
  companySize: z.array(z.enum(['startup', 'small', 'medium', 'large', 'enterprise'])),
  benefits: z.array(z.string()),
  notes: z.string().max(1000).optional()
}).refine(data => !data.salaryMax || !data.salaryMin || data.salaryMax >= data.salaryMin, {
  message: "Maximum salary must be greater than minimum salary",
  path: ["salaryMax"]
})

type JobPreferencesData = z.infer<typeof jobPreferencesSchema>

const experienceLevels = [
  { value: 'entry', label: 'Entry Level (0-1 years)' },
  { value: 'junior', label: 'Junior (1-3 years)' },
  { value: 'mid', label: 'Mid Level (3-5 years)' },
  { value: 'senior', label: 'Senior (5-8 years)' },
  { value: 'lead', label: 'Lead/Principal (8+ years)' },
  { value: 'executive', label: 'Executive (C-Level)' }
]

const employmentTypes = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' }
]

const remoteWorkOptions = [
  { value: 'no', label: 'On-site only' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'full', label: 'Fully remote' }
]

const companySizes = [
  { value: 'startup', label: 'Startup (1-10 employees)' },
  { value: 'small', label: 'Small (11-50 employees)' },
  { value: 'medium', label: 'Medium (51-200 employees)' },
  { value: 'large', label: 'Large (201-1000 employees)' },
  { value: 'enterprise', label: 'Enterprise (1000+ employees)' }
]

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' }
]

export default function JobPreferencesPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newIndustry, setNewIndustry] = useState('')
  const [newBenefit, setNewBenefit] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues
  } = useForm<JobPreferencesData>({
    resolver: zodResolver(jobPreferencesSchema),
    defaultValues: {
      desiredRoles: [],
      experienceLevel: 'mid',
      employmentTypes: ['full-time'],
      workLocations: [],
      remoteWork: 'hybrid',
      currency: 'USD',
      skills: [],
      industries: [],
      companySize: [],
      benefits: []
    }
  })

  useEffect(() => {
    if (session?.user) {
      loadPreferences()
    }
  }, [session])

  const loadPreferences = async () => {
    try {
      const data = await api.get('/api/job-preferences')
      if (data) {
        reset(data)
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }

  const onSubmit = async (data: JobPreferencesData) => {
    setIsLoading(true)
    try {
      await api.put('/api/job-preferences', data)
      
      toast({
        title: 'Preferences updated',
        description: 'Your job preferences have been successfully saved.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = (field: keyof JobPreferencesData, newItem: string, setter: (value: string) => void) => {
    if (newItem.trim()) {
      const currentItems = getValues(field) as string[] || []
      if (!currentItems.includes(newItem.trim())) {
        setValue(field, [...currentItems, newItem.trim()] as any)
      }
      setter('')
    }
  }

  const removeItem = (field: keyof JobPreferencesData, itemToRemove: string) => {
    const currentItems = getValues(field) as string[] || []
    setValue(field, currentItems.filter(item => item !== itemToRemove) as any)
  }

  const toggleArrayItem = (field: keyof JobPreferencesData, item: string) => {
    const currentItems = getValues(field) as string[] || []
    const newItems = currentItems.includes(item) 
      ? currentItems.filter(i => i !== item)
      : [...currentItems, item]
    setValue(field, newItems as any)
  }

  if (!session) {
    return <div>Loading...</div>
  }

  const watchedFields = watch()

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Desired Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="h-5 w-5 mr-2" />
              Desired Roles
            </CardTitle>
            <CardDescription>
              Specify the job roles you're interested in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Add a role (e.g., Software Engineer)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem('desiredRoles', newRole, setNewRole)
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => addItem('desiredRoles', newRole, setNewRole)}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {watchedFields.desiredRoles?.map((role, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {role}
                  <button
                    type="button"
                    onClick={() => removeItem('desiredRoles', role)}
                    className="ml-2 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {errors.desiredRoles && (
              <p className="text-sm text-red-600">{errors.desiredRoles.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Experience & Employment */}
        <Card>
          <CardHeader>
            <CardTitle>Experience & Employment Type</CardTitle>
            <CardDescription>
              Define your experience level and preferred employment types.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {experienceLevels.map((level) => (
                  <label key={level.value} className="flex items-center">
                    <input
                      type="radio"
                      value={level.value}
                      {...register('experienceLevel')}
                      className="mr-2"
                    />
                    <span className="text-sm">{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employment Types
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {employmentTypes.map((type) => (
                  <label key={type.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={watchedFields.employmentTypes?.includes(type.value as any)}
                      onChange={() => toggleArrayItem('employmentTypes', type.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">{type.label}</span>
                  </label>
                ))}
              </div>
              {errors.employmentTypes && (
                <p className="text-sm text-red-600">{errors.employmentTypes.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location & Remote Work */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location & Remote Work
            </CardTitle>
            <CardDescription>
              Set your preferred work locations and remote work preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remote Work Preference
              </label>
              <div className="flex gap-4">
                {remoteWorkOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="radio"
                      value={option.value}
                      {...register('remoteWork')}
                      className="mr-2"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Locations
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Add a location (e.g., San Francisco, CA)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem('workLocations', newLocation, setNewLocation)
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => addItem('workLocations', newLocation, setNewLocation)}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {watchedFields.workLocations?.map((location, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                  >
                    {location}
                    <button
                      type="button"
                      onClick={() => removeItem('workLocations', location)}
                      className="ml-2 hover:text-green-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {errors.workLocations && (
                <p className="text-sm text-red-600">{errors.workLocations.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Salary Expectations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Salary Expectations
            </CardTitle>
            <CardDescription>
              Set your expected salary range (optional).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  {...register('currency')}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {currencies.map((curr) => (
                    <option key={curr.value} value={curr.value}>
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Salary
                </label>
                <Input
                  type="number"
                  {...register('salaryMin', { valueAsNumber: true })}
                  placeholder="50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Salary
                </label>
                <Input
                  type="number"
                  {...register('salaryMax', { valueAsNumber: true })}
                  placeholder="100000"
                />
                {errors.salaryMax && (
                  <p className="text-sm text-red-600">{errors.salaryMax.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Skills & Technologies</CardTitle>
            <CardDescription>
              Add skills and technologies you want to work with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill (e.g., React, Python)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem('skills', newSkill, setNewSkill)
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => addItem('skills', newSkill, setNewSkill)}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {watchedFields.skills?.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeItem('skills', skill)}
                    className="ml-2 hover:text-purple-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Company Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Company Preferences</CardTitle>
            <CardDescription>
              Specify your preferred company types and industries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Size
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {companySizes.map((size) => (
                  <label key={size.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={watchedFields.companySize?.includes(size.value as any)}
                      onChange={() => toggleArrayItem('companySize', size.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">{size.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industries of Interest
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  placeholder="Add an industry (e.g., FinTech, Healthcare)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem('industries', newIndustry, setNewIndustry)
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => addItem('industries', newIndustry, setNewIndustry)}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {watchedFields.industries?.map((industry, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                  >
                    {industry}
                    <button
                      type="button"
                      onClick={() => removeItem('industries', industry)}
                      className="ml-2 hover:text-orange-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desired Benefits
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Add a benefit (e.g., Health Insurance, 401k)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem('benefits', newBenefit, setNewBenefit)
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => addItem('benefits', newBenefit, setNewBenefit)}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {watchedFields.benefits?.map((benefit, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                  >
                    {benefit}
                    <button
                      type="button"
                      onClick={() => removeItem('benefits', benefit)}
                      className="ml-2 hover:text-indigo-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Any additional preferences or requirements not covered above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register('notes')}
              rows={4}
              placeholder="Add any additional notes about your job preferences..."
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} size="lg">
            {isLoading ? 'Saving...' : 'Save Job Preferences'}
          </Button>
        </div>
      </form>
    </div>
  )
}