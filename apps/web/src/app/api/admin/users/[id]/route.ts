import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@jobai/database'
import { UserRole } from '@jobai/database'
import { z } from 'zod'

const updateUserSchema = z.object({
  role: z.enum([UserRole.USER, UserRole.PREMIUM, UserRole.ADMIN]).optional(),
  emailVerified: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        profile: true,
        _count: {
          select: {
            applications: true,
            resumes: true,
            savedJobs: true,
            activities: true,
          },
        },
        applications: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            appliedAt: true,
            job: {
              select: {
                title: true,
                company: true,
              },
            },
          },
        },
        activities: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            description: true,
            createdAt: true,
          },
        },
      },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      ...user,
      status: user.emailVerified ? 'active' : 'pending',
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    
    const body = await request.json()
    const data = updateUserSchema.parse(body)
    
    // Convert emailVerified boolean to Date or null
    const updateData: any = {}
    
    if (data.role !== undefined) {
      updateData.role = data.role
    }
    
    if (data.emailVerified !== undefined) {
      updateData.emailVerified = data.emailVerified ? new Date() : null
    }
    
    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        updatedAt: true,
      },
    })
    
    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'APPLICATION_UPDATED', // We might want to add ADMIN_ACTION type
        description: `Admin updated user profile`,
        metadata: {
          changedFields: Object.keys(updateData),
          changes: updateData,
        },
      },
    })
    
    return NextResponse.json({
      ...user,
      status: user.emailVerified ? 'active' : 'pending',
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Don't allow deletion of other admins
    if (user.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 403 }
      )
    }
    
    // Delete user and all related data (cascading deletes should handle this)
    await prisma.user.delete({
      where: { id: params.id },
    })
    
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}