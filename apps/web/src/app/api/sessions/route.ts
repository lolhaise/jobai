import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@jobai/database'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await prisma.session.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' }
    })

    // Mock additional session data since NextAuth sessions don't store this by default
    const enrichedSessions = sessions.map(s => ({
      id: s.id,
      userId: s.userId,
      expires: s.expires,
      sessionToken: s.sessionToken,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      userAgent: 'Chrome 91.0.4472.124', // Would normally come from session creation
      ipAddress: '192.168.1.1', // Would normally be stored during session creation
      location: 'San Francisco, CA', // Would be resolved from IP
      isCurrent: s.sessionToken === (session as any).sessionToken
    }))

    return NextResponse.json({ sessions: enrichedSessions })
  } catch (error) {
    console.error('Sessions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Verify the session belongs to the current user
    const sessionToDelete = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!sessionToDelete) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Don't allow deleting the current session
    if (sessionToDelete.sessionToken === (session as any).sessionToken) {
      return NextResponse.json({ error: 'Cannot delete current session' }, { status: 400 })
    }

    await prisma.session.delete({
      where: { id: sessionId }
    })

    return NextResponse.json({ message: 'Session deleted successfully' })
  } catch (error) {
    console.error('Sessions DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}