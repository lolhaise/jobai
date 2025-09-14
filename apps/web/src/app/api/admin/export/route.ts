import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@jobai/database'
import { z } from 'zod'

const exportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  type: z.enum(['users', 'applications', 'activities']).default('users'),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    const body = await request.json()
    const { format, type, dateRange } = exportSchema.parse(body)
    
    let data: any[] = []
    let filename = ''
    
    // Build date filter
    const dateFilter: any = {}
    if (dateRange?.from) {
      dateFilter.gte = new Date(dateRange.from)
    }
    if (dateRange?.to) {
      dateFilter.lte = new Date(dateRange.to)
    }
    
    const hasDateFilter = Object.keys(dateFilter).length > 0
    
    switch (type) {
      case 'users':
        data = await prisma.user.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                applications: true,
                resumes: true,
                savedJobs: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
        
        data = data.map(user => ({
          ...user,
          status: user.emailVerified ? 'active' : 'pending',
          applicationsCount: user._count.applications,
          resumesCount: user._count.resumes,
          savedJobsCount: user._count.savedJobs,
        }))
        
        filename = `users-export-${new Date().toISOString().split('T')[0]}`
        break
        
      case 'applications':
        data = await prisma.application.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            job: {
              select: {
                title: true,
                company: true,
                location: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
        
        data = data.map(app => ({
          id: app.id,
          userEmail: app.user.email,
          userName: app.user.name,
          jobTitle: app.job.title,
          company: app.job.company,
          location: app.job.location,
          status: app.status,
          stage: app.stage,
          appliedAt: app.appliedAt,
          createdAt: app.createdAt,
        }))
        
        filename = `applications-export-${new Date().toISOString().split('T')[0]}`
        break
        
      case 'activities':
        data = await prisma.activity.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10000, // Limit to prevent memory issues
        })
        
        data = data.map(activity => ({
          id: activity.id,
          userEmail: activity.user.email,
          userName: activity.user.name,
          type: activity.type,
          description: activity.description,
          createdAt: activity.createdAt,
        }))
        
        filename = `activities-export-${new Date().toISOString().split('T')[0]}`
        break
    }
    
    if (format === 'csv') {
      const csv = convertToCSV(data)
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    } else {
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })
    }
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')
  
  const csvRows = data.map(row => {
    const values = headers.map(header => {
      const val = row[header]
      if (val === null || val === undefined) return ''
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`
      }
      if (val instanceof Date) {
        return val.toISOString()
      }
      return String(val)
    })
    return values.join(',')
  })
  
  return [csvHeaders, ...csvRows].join('\n')
}