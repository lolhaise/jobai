import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@jobai/database'
import { z } from 'zod'

const jobPreferencesSchema = z.object({
  desiredRoles: z.array(z.string()).min(1),
  experienceLevel: z.enum(['entry', 'junior', 'mid', 'senior', 'lead', 'executive']),
  employmentTypes: z.array(z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship'])).min(1),
  workLocations: z.array(z.string()).min(1),
  remoteWork: z.enum(['no', 'hybrid', 'full']),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  currency: z.string().default('USD'),
  skills: z.array(z.string()),
  industries: z.array(z.string()),
  companySize: z.array(z.enum(['startup', 'small', 'medium', 'large', 'enterprise'])),
  benefits: z.array(z.string()),
  notes: z.string().max(1000).optional()
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await prisma.jobPreferences.findUnique({
      where: { userId: session.user.id }
    })

    if (!preferences) {
      // Return default values if no preferences exist
      return NextResponse.json({
        desiredRoles: [],
        experienceLevel: 'mid',
        employmentTypes: ['full-time'],
        workLocations: [],
        remoteWork: 'hybrid',
        currency: 'USD',
        skills: [],
        industries: [],
        companySize: [],
        benefits: []
      })
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Job preferences GET error:', error)
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
    const validatedData = jobPreferencesSchema.parse(body)

    const preferences = await prisma.jobPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...validatedData
      },
      update: validatedData
    })

    return NextResponse.json({ 
      message: 'Job preferences updated successfully',
      preferences 
    })
  } catch (error) {
    console.error('Job preferences PUT error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}