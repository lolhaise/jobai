import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@jobai/database'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = params

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
    console.error('Session DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}