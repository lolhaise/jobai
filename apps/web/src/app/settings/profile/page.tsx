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
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'
import { Upload, User } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  linkedin: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  github: z.string().url('Invalid GitHub URL').optional().or(z.literal(''))
})

type ProfileData = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema)
  })

  useEffect(() => {
    if (session?.user) {
      // Load profile data
      loadProfile()
    }
  }, [session])

  const loadProfile = async () => {
    try {
      const data = await api.get('/api/profile')
      setProfile(data)
      reset({
        name: data.user.name || '',
        email: data.user.email || '',
        bio: data.bio || '',
        location: data.location || '',
        website: data.website || '',
        linkedin: data.linkedin || '',
        github: data.github || ''
      })
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }

  const onSubmit = async (data: ProfileData) => {
    setIsLoading(true)
    try {
      await api.put('/api/profile', data)
      
      // Update session if name or email changed
      if (data.name !== session?.user?.name || data.email !== session?.user?.email) {
        await update({
          name: data.name,
          email: data.email
        })
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      setIsLoading(true)
      await api.post('/api/profile/avatar', formData)
      await loadProfile()
      await update()
      
      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been successfully updated.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update avatar. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information and profile details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage 
                src={session.user?.image || ''} 
                alt={session.user?.name || 'User avatar'}
                className="h-20 w-20 rounded-full object-cover"
              />
              <AvatarFallback className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </AvatarFallback>
            </Avatar>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="relative overflow-hidden"
                disabled={isLoading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Change Avatar
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </Button>
              <p className="text-sm text-gray-500 mt-1">
                JPG, GIF or PNG. Max size 1MB.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <Input
                  id="name"
                  {...register('name')}
                  className="mt-1"
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="mt-1"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                Bio
              </label>
              <Textarea
                id="bio"
                {...register('bio')}
                className="mt-1"
                rows={4}
                placeholder="Tell us about yourself..."
              />
              {errors.bio && (
                <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <Input
                id="location"
                {...register('location')}
                className="mt-1"
                placeholder="City, Country"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Website
                </label>
                <Input
                  id="website"
                  {...register('website')}
                  className="mt-1"
                  placeholder="https://example.com"
                />
                {errors.website && (
                  <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700">
                  LinkedIn
                </label>
                <Input
                  id="linkedin"
                  {...register('linkedin')}
                  className="mt-1"
                  placeholder="https://linkedin.com/in/username"
                />
                {errors.linkedin && (
                  <p className="mt-1 text-sm text-red-600">{errors.linkedin.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="github" className="block text-sm font-medium text-gray-700">
                  GitHub
                </label>
                <Input
                  id="github"
                  {...register('github')}
                  className="mt-1"
                  placeholder="https://github.com/username"
                />
                {errors.github && (
                  <p className="mt-1 text-sm text-red-600">{errors.github.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}