// Optional Authentication Guard
// Allows requests to proceed with or without authentication
// If authenticated, adds user to request; otherwise continues without user

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  /**
   * Override canActivate to make authentication optional
   * Always returns true, but attempts to authenticate if possible
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Try to authenticate
      await super.canActivate(context);
    } catch {
      // If authentication fails, that's okay - continue without user
    }
    
    // Always allow the request to proceed
    return true;
  }

  /**
   * Override handleRequest to not throw errors
   * Returns user if authenticated, null otherwise
   */
  handleRequest(err: any, user: any) {
    // Return user if authenticated, null otherwise
    return user || null;
  }
}