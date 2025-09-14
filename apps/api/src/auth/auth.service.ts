import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { prisma } from '@jobai/database'

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    return user
  }

  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token)
      return payload
    } catch (error) {
      throw new UnauthorizedException('Invalid token')
    }
  }

  generateToken(userId: string, email: string, role?: string) {
    const payload = { sub: userId, email, role: role || 'USER' }
    return this.jwtService.sign(payload)
  }
}