import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@jobai/database'
import { UserRole } from '@jobai/database'

export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    throw new Error('Authentication required')
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })
  
  if (user?.role !== UserRole.ADMIN) {
    throw new Error('Admin access required')
  }
  
  return session
}

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  return user?.role === UserRole.ADMIN
}

export const USER_ROLES = [
  { value: UserRole.USER, label: 'User' },
  { value: UserRole.PREMIUM, label: 'Premium' },
  { value: UserRole.ADMIN, label: 'Admin' },
] as const

export const USER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
] as const

export function getUserStatus(user: { emailVerified: Date | null }): 'active' | 'pending' {
  return user.emailVerified ? 'active' : 'pending'
}

export function formatUserRole(role: UserRole): string {
  const roleMap = {
    [UserRole.USER]: 'User',
    [UserRole.PREMIUM]: 'Premium',
    [UserRole.ADMIN]: 'Admin',
  }
  return roleMap[role]
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}