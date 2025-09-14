import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@jobai/database'
import { UserRole } from '@jobai/database'
import { z } from 'zod'

const bulkUpdateSchema = z.object({
  userIds: z.array(z.string()).min(1),
  action: z.enum(['activate', 'deactivate', 'delete', 'changeRole']),
  role: z.enum([UserRole.USER, UserRole.PREMIUM, UserRole.ADMIN]).optional(),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    const body = await request.json()
    const { userIds, action, role } = bulkUpdateSchema.parse(body)
    
    let result: any = {}
    
    switch (action) {
      case 'activate':
        result = await prisma.user.updateMany({
          where: {
            id: { in: userIds },
            emailVerified: null,
          },
          data: {
            emailVerified: new Date(),
          },
        })
        break
        
      case 'deactivate':
        result = await prisma.user.updateMany({
          where: {
            id: { in: userIds },
            role: { not: UserRole.ADMIN }, // Don't deactivate admins
          },
          data: {
            emailVerified: null,
          },
        })
        break
        
      case 'changeRole':
        if (!role) {
          return NextResponse.json(
            { error: 'Role is required for changeRole action' },
            { status: 400 }
          )
        }
        
        result = await prisma.user.updateMany({
          where: {
            id: { in: userIds },
          },
          data: {
            role,
          },
        })
        break
        
      case 'delete':
        // Don't allow deletion of admins
        const adminUsers = await prisma.user.findMany({
          where: {
            id: { in: userIds },
            role: UserRole.ADMIN,
          },
          select: { id: true },
        })
        
        if (adminUsers.length > 0) {
          return NextResponse.json(
            { error: 'Cannot delete admin users' },
            { status: 403 }
          )
        }
        
        result = await prisma.user.deleteMany({
          where: {
            id: { in: userIds },
            role: { not: UserRole.ADMIN },
          },
        })
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
    // Log bulk action
    await prisma.activity.createMany({
      data: userIds.map(userId => ({
        userId,
        type: 'APPLICATION_UPDATED', // We might want to add ADMIN_BULK_ACTION type
        description: `Admin performed bulk action: ${action}`,
        metadata: {
          action,
          role: role || null,
          bulkOperation: true,
        },
      })),
    })
    
    return NextResponse.json({
      message: `Successfully performed ${action} on ${result.count} users`,
      affectedCount: result.count,
    })
  } catch (error) {
    console.error('Error performing bulk action:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    )
  }
}