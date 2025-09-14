import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@jobai/database'
import { z } from 'zod'

const getActivitiesSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  search: z.string().optional(),
  type: z.string().optional(),
  userId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const { searchParams } = new URL(request.url)
    const params = getActivitiesSchema.parse(Object.fromEntries(searchParams))
    
    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const skip = (page - 1) * limit
    
    // Build where clause
    const where: any = {}
    
    if (params.search) {
      where.OR = [
        { description: { contains: params.search, mode: 'insensitive' } },
        { user: { 
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ]
        }},
      ]
    }
    
    if (params.type) {
      where.type = params.type
    }
    
    if (params.userId) {
      where.userId = params.userId
    }
    
    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          description: true,
          createdAt: true,
          metadata: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.activity.count({ where }),
    ])
    
    const totalPages = Math.ceil(totalCount / limit)
    
    return NextResponse.json({
      activities,
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
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}