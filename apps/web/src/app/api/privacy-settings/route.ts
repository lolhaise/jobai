import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@jobai/database'
import { z } from 'zod'

const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'private', 'connections-only']),
  showEmail: z.boolean(),
  showLocation: z.boolean(),
  showSalaryExpectations: z.boolean(),
  showJobPreferences: z.boolean(),
  allowSearchEngineIndexing: z.boolean(),
  allowRecruiterContact: z.boolean(),
  allowDataAnalytics: z.boolean(),
  allowMarketingEmails: z.boolean(),
  allowJobAlerts: z.boolean(),
  dataRetentionPeriod: z.enum(['1-year', '2-years', '5-years', 'indefinite'])
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.privacySettings.findUnique({
      where: { userId: session.user.id }
    })

    if (!settings) {
      // Return default values
      return NextResponse.json({
        profileVisibility: 'public',
        showEmail: false,
        showLocation: true,
        showSalaryExpectations: false,
        showJobPreferences: true,
        allowSearchEngineIndexing: true,
        allowRecruiterContact: true,
        allowDataAnalytics: true,
        allowMarketingEmails: false,
        allowJobAlerts: true,
        dataRetentionPeriod: 'indefinite'
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Privacy settings GET error:', error)
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
    const validatedData = privacySettingsSchema.parse(body)

    const settings = await prisma.privacySettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...validatedData
      },
      update: validatedData
    })

    return NextResponse.json({ 
      message: 'Privacy settings updated successfully',
      settings 
    })
  } catch (error) {
    console.error('Privacy settings PUT error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}