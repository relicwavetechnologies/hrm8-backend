import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { sessionRepository } from '../modules/auth/session.repository';
import { getSessionCookieOptions } from '../utils/session';

interface DecodedToken {
  userId: string;
  email: string;
  companyId: string;
  role: string;
  type: string;
  name?: string;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token = req.cookies.auth_token;
    const sessionId = req.cookies.sessionId;

    // Bearer token helper (if we still support JWTs/Tokens directly)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }


    // console.log('[authenticate] Checking authentication');
    // console.log('[authenticate] All cookies:', req.cookies);

    // 1. Try Session ID (Primary for Web App)
    if (sessionId) {
      const session = await sessionRepository.findBySessionId(sessionId);

      if (!session) {
        console.warn('[authenticate] Session not found or expired for ID:', sessionId);
        res.clearCookie('sessionId', getSessionCookieOptions());
        res.status(401).json({
          success: false,
          error: 'Session expired or invalid',
        });
        return;
      }

      req.user = {
        id: session.userId,
        email: session.email,
        companyId: session.companyId,
        role: session.userRole as UserRole,
        type: 'COMPANY', // Defaulting to COMPANY for now, schema might differ
      };

      return next();
    }

    // 2. Fallback: Try JWT Token (if needed for API/mobile)
    if (token) {
      // ... existing JWT logic if we want to keep it ...
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          companyId: decoded.companyId,
          role: decoded.role as UserRole,
          type: decoded.type as 'COMPANY' | 'CONSULTANT' | 'SALES_AGENT',
        };
        return next();
      } catch (e) {
        console.warn('[authenticate] Invalid JWT token');
      }
    }

    console.error('[authenticate] No valid session or token found');
    res.status(401).json({
      success: false,
      error: 'Not authenticated. Please login.',
    });
    return;

  } catch (error) {
    console.error('[authenticate] Error during authentication:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}
