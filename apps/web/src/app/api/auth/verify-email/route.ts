import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@jobai/database'
import crypto from 'crypto'

const sendVerificationSchema = z.object({
  userId: z.string()
})

const verifyEmailSchema = z.object({
  token: z.string()
})

// Send verification email
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId } = sendVerificationSchema.parse(body)
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email already verified' },
        { status: 200 }
      )
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    
    // Save verification token
    await prisma.verificationToken.create({
      data: {
        identifier: user.email!,
        token: verificationToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })
    
    // TODO: Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${verificationToken}`
    console.log('Verification URL:', verificationUrl)
    
    return NextResponse.json(
      { 
        message: 'Verification email sent',
        debug: process.env.NODE_ENV === 'development' ? { verificationUrl } : undefined
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }
    
    console.error('Send verification error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    )
  }
}

// Verify email with token
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { token } = verifyEmailSchema.parse(body)
    
    // Find verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: {
          gt: new Date()
        }
      }
    })
    
    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date()
      }
    })
    
    // Delete used token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token
        }
      }
    })
    
    return NextResponse.json(
      { message: 'Email verified successfully' },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }
    
    console.error('Verify email error:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}