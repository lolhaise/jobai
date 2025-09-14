import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@jobai/database'
import { z } from 'zod'

const notificationSettingsSchema = z.object({
  // Email notifications
  emailJobAlerts: z.boolean(),
  emailApplicationUpdates: z.boolean(),
  emailInterviewReminders: z.boolean(),
  emailWeeklyDigest: z.boolean(),
  emailSecurityAlerts: z.boolean(),
  emailAccountUpdates: z.boolean(),
  emailMarketing: z.boolean(),
  
  // Push notifications
  pushJobAlerts: z.boolean(),
  pushApplicationUpdates: z.boolean(),
  pushInterviewReminders: z.boolean(),
  pushMessages: z.boolean(),
  pushSecurityAlerts: z.boolean(),
  
  // Job alert preferences
  alertFrequency: z.enum(['immediate', 'daily', 'weekly', 'never']),
  alertDistance: z.number().min(0).max(500),
  alertSalaryThreshold: z.number().min(0).optional(),
  alertOnlyRemote: z.boolean(),
  alertOnlyFullTime: z.boolean(),
  
  // Digest preferences
  weeklyDigestDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  digestIncludeJobStats: z.boolean(),
  digestIncludeMarketTrends: z.boolean(),
  digestIncludeTips: z.boolean(),
  
  // Quiet hours
  enableQuietHours: z.boolean(),
  quietHoursStart: z.string(),
  quietHoursEnd: z.string(),
  quietHoursTimezone: z.string()
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.notificationSettings.findUnique({
      where: { userId: session.user.id }
    })

    if (!settings) {
      // Return default values
      return NextResponse.json({
        emailJobAlerts: true,
        emailApplicationUpdates: true,
        emailInterviewReminders: true,
        emailWeeklyDigest: true,
        emailSecurityAlerts: true,
        emailAccountUpdates: true,
        emailMarketing: false,
        pushJobAlerts: true,
        pushApplicationUpdates: true,
        pushInterviewReminders: true,
        pushMessages: true,
        pushSecurityAlerts: true,
        alertFrequency: 'daily',
        alertDistance: 50,
        alertOnlyRemote: false,
        alertOnlyFullTime: false,
        weeklyDigestDay: 'monday',
        digestIncludeJobStats: true,
        digestIncludeMarketTrends: true,
        digestIncludeTips: true,
        enableQuietHours: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        quietHoursTimezone: 'UTC'
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Notification settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = notificationSettingsSchema.parse(body)

    const settings = await prisma.notificationSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...validatedData
      },
      update: validatedData
    })

    return NextResponse.json({ 
      message: 'Notification settings updated successfully',
      settings 
    })
  } catch (error) {
    console.error('Notification settings PUT error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}