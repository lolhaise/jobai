import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@jobai/database'
import { UserRole } from '@jobai/database'
import { z } from 'zod'

const getUsersSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  role: z.enum([UserRole.USER, UserRole.PREMIUM, UserRole.ADMIN]).optional(),
  status: z.enum(['active', 'pending', 'suspended']).optional(),
  sortBy: z.enum(['createdAt', 'name', 'email', 'lastActive']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const { searchParams } = new URL(request.url)
    const params = getUsersSchema.parse(Object.fromEntries(searchParams))
    
    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const skip = (page - 1) * limit
    
    // Build where clause
    const where: any = {}
    
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ]
    }
    
    if (params.role) {
      where.role = params.role
    }
    
    if (params.status) {
      switch (params.status) {
        case 'active':
          where.emailVerified = { not: null }
          break
        case 'pending':
          where.emailVerified = null
          break
        case 'suspended':
          // Note: You might need to add a suspended field to your schema
          // For now, we'll treat this as no email verification
          where.emailVerified = null
          break
      }
    }
    
    // Build orderBy clause
    let orderBy: any = {}
    switch (params.sortBy) {
      case 'name':
        orderBy = { name: params.sortOrder }
        break
      case 'email':
        orderBy = { email: params.sortOrder }
        break
      case 'lastActive':
        // You might need to add a lastActiveAt field to track this
        orderBy = { updatedAt: params.sortOrder }
        break
      default:
        orderBy = { createdAt: params.sortOrder }
    }
    
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          image: true,
          _count: {
            select: {
              applications: true,
              resumes: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])
    
    const totalPages = Math.ceil(totalCount / limit)
    
    return NextResponse.json({
      users: users.map(user => ({
        ...user,
        status: user.emailVerified ? 'active' : 'pending',
        applicationsCount: user._count.applications,
        resumesCount: user._count.resumes,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}