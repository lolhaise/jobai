import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@jobai/database'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email()
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json(
        { message: 'If an account exists with this email, you will receive a password reset link.' },
        { status: 200 }
      )
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now
    
    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry
      }
    })
    
    // TODO: Send email with reset link
    // For now, we'll just return the token (remove in production)
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
    
    console.log('Password reset URL:', resetUrl)
    
    return NextResponse.json(
      { 
        message: 'If an account exists with this email, you will receive a password reset link.',
        // Remove this in production
        debug: process.env.NODE_ENV === 'development' ? { resetUrl } : undefined
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }
    
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}