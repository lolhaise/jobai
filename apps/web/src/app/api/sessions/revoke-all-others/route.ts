import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@jobai/database'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all sessions except the current one
    await prisma.session.deleteMany({
      where: {
        userId: session.user.id,
        NOT: {
          sessionToken: (session as any).sessionToken
        }
      }
    })

    return NextResponse.json({ message: 'All other sessions revoked successfully' })
  } catch (error) {
    console.error('Revoke all sessions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}