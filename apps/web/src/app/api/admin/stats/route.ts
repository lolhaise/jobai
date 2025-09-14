import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@jobai/database'
import { UserRole } from '@jobai/database'

export async function GET() {
  try {
    await requireAdmin()
    
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    // User statistics
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      premiumUsers,
      adminUsers,
      newUsersThisWeek,
      newUsersToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: { not: null } } }),
      prisma.user.count({ where: { emailVerified: null } }),
      prisma.user.count({ where: { role: UserRole.PREMIUM } }),
      prisma.user.count({ where: { role: UserRole.ADMIN } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
    ])
    
    // Application statistics
    const [
      totalApplications,
      applicationsThisWeek,
      applicationsToday,
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.application.count({ where: { createdAt: { gte: oneDayAgo } } }),
    ])
    
    // Job statistics
    const [
      totalJobs,
      activeJobs,
      jobsThisWeek,
    ] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { isActive: true } }),
      prisma.job.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ])
    
    // User growth over last 30 days
    const userGrowthData = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "User" 
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date
    ` as Array<{ date: string; count: bigint }>
    
    // Application status distribution
    const applicationStatusData = await prisma.application.groupBy({
      by: ['status'],
      _count: { status: true },
    })
    
    // User role distribution
    const userRoleData = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    })
    
    // Top companies by application count
    const topCompanies = await prisma.application.groupBy({
      by: ['jobId'],
      _count: { jobId: true },
      orderBy: { _count: { jobId: 'desc' } },
      take: 10,
    })
    
    // Get company names for top companies
    const topCompaniesWithNames = await Promise.all(
      topCompanies.map(async (item) => {
        const job = await prisma.job.findUnique({
          where: { id: item.jobId },
          select: { company: true },
        })
        return {
          company: job?.company || 'Unknown',
          applicationCount: item._count.jobId,
        }
      })
    )
    
    return NextResponse.json({
      overview: {
        totalUsers,
        activeUsers,
        pendingUsers,
        premiumUsers,
        adminUsers,
        newUsersThisWeek,
        newUsersToday,
        totalApplications,
        applicationsThisWeek,
        applicationsToday,
        totalJobs,
        activeJobs,
        jobsThisWeek,
      },
      charts: {
        userGrowth: userGrowthData.map(item => ({
          date: item.date,
          count: Number(item.count),
        })),
        applicationStatus: applicationStatusData.map(item => ({
          status: item.status,
          count: item._count.status,
        })),
        userRoles: userRoleData.map(item => ({
          role: item.role,
          count: item._count.role,
        })),
        topCompanies: topCompaniesWithNames,
      },
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}