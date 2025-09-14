'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { AlertTriangle, Shield, Mail, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

const emailSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password is required')
})

type PasswordData = z.infer<typeof passwordSchema>
type EmailData = z.infer<typeof emailSchema>

export default function AccountPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema)
  })

  const emailForm = useForm<EmailData>({
    resolver: zodResolver(emailSchema)
  })

  const onPasswordSubmit = async (data: PasswordData) => {
    setIsPasswordLoading(true)
    try {
      await api.post('/api/account/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })
      
      passwordForm.reset()
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update password. Please check your current password.',
        variant: 'destructive'
      })
    } finally {
      setIsPasswordLoading(false)
    }
  }

  const onEmailSubmit = async (data: EmailData) => {
    setIsEmailLoading(true)
    try {
      await api.post('/api/account/change-email', {
        newEmail: data.newEmail,
        password: data.password
      })
      
      emailForm.reset()
      toast({
        title: 'Email update initiated',
        description: 'Please check your new email for verification instructions.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update email. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsEmailLoading(false)
    }
  }

  const resendVerificationEmail = async () => {
    try {
      await api.post('/api/account/resend-verification')
      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox for the verification email.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send verification email. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast({
        title: 'Error',
        description: 'Please type "DELETE" to confirm account deletion.',
        variant: 'destructive'
      })
      return
    }

    try {
      await api.delete('/api/account')
      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.'
      })
      // Redirect will happen automatically due to session invalidation
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please try again.',
        variant: 'destructive'
      })
    }
  }

  if (!session) {
    return <div>Loading...</div>
  }

  const isOAuthUser = session.user?.provider && session.user.provider !== 'credentials'

  return (
    <div className="space-y-6">
      {/* Email Verification Status */}
      {!session.user?.emailVerified && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-orange-600 mr-2" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-orange-800">
                  Email not verified
                </h3>
                <p className="text-sm text-orange-700 mt-1">
                  Please verify your email address to secure your account.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resendVerificationEmail}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Resend Email
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password */}
      {!isOAuthUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...passwordForm.register('currentPassword')}
                  className="mt-1"
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...passwordForm.register('newPassword')}
                    className="mt-1"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...passwordForm.register('confirmPassword')}
                    className="mt-1"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPasswordLoading}>
                  {isPasswordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Change Email */}
      {!isOAuthUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Change Email Address
            </CardTitle>
            <CardDescription>
              Update your email address. You'll need to verify the new email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Current email:</strong> {session.user?.email}
              </p>
            </div>

            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">
                  New Email Address
                </label>
                <Input
                  id="newEmail"
                  type="email"
                  {...emailForm.register('newEmail')}
                  className="mt-1"
                  placeholder="Enter new email address"
                />
                {emailForm.formState.errors.newEmail && (
                  <p className="mt-1 text-sm text-red-600">
                    {emailForm.formState.errors.newEmail.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="emailPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <Input
                  id="emailPassword"
                  type="password"
                  {...emailForm.register('password')}
                  className="mt-1"
                  placeholder="Enter your password to confirm"
                />
                {emailForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {emailForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isEmailLoading}>
                  {isEmailLoading ? 'Updating...' : 'Update Email'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Delete Account */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-700">
            Irreversible and destructive actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-800">Delete Account</h3>
              <p className="text-sm text-red-700 mt-1">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </div>
            <Dialog.Root open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <Dialog.Trigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-full max-w-md z-50">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                    Delete Account
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-gray-600 mb-4">
                    This action cannot be undone. This will permanently delete your account
                    and remove your data from our servers.
                  </Dialog.Description>
                  
                  <div className="mb-4">
                    <label htmlFor="deleteConfirmation" className="block text-sm font-medium text-gray-700 mb-2">
                      Type <strong>DELETE</strong> to confirm:
                    </label>
                    <Input
                      id="deleteConfirmation"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="DELETE"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Dialog.Close asChild>
                      <Button variant="outline">Cancel</Button>
                    </Dialog.Close>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmation !== 'DELETE'}
                    >
                      Delete Account
                    </Button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}