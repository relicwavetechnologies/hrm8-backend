import { Response, NextFunction } from 'express';
import { ConsultantAuthenticatedRequest } from '../types';
import { prisma } from '../utils/prisma';

export async function authenticateConsultant(
  req: ConsultantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check for authorization header (Bearer token) or cookie
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.consultantToken) {
      token = req.cookies.consultantToken;
    }

    // --- ADMIN BYPASS LOGIC START ---
    // If no consultant token, checking for Admin token to allow admin access to sales routes
    if (!token && req.cookies && req.cookies.hrm8SessionId) {
      // Verify Admin Session
      const adminToken = req.cookies.hrm8SessionId;
      const adminSession = await prisma.session.findUnique({
        where: { session_id: adminToken },
        include: { user: true }
      });

      if (adminSession && adminSession.expires_at >= new Date()) {
        // Find a real consultant to masquerade as
        const realConsultant = await prisma.consultant.findFirst({
          where: { status: 'ACTIVE' }
        });

        if (realConsultant) {
          req.consultant = {
            id: realConsultant.id,
            email: realConsultant.email,
            firstName: realConsultant.first_name,
            lastName: realConsultant.last_name,
            role: realConsultant.role
          };
        } else {
          // Fallback if no consultant exists
          const [firstName, ...lastNameParts] = (adminSession.user.name || 'Admin User').split(' ');
          req.consultant = {
            id: adminSession.user.id, // Using Admin ID
            email: adminSession.user.email,
            firstName: firstName || 'Admin',
            lastName: lastNameParts.join(' ') || 'User',
            role: 'CONSULTANT_360'
          } as any;
        }
        res.locals.isHrm8Admin = true;
        next();
        return;
      }
    }
    // --- ADMIN BYPASS LOGIC END ---

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    // Verify session
    const session = await prisma.consultantSession.findUnique({
      where: { session_id: token },
      include: { consultant: true },
    });

    if (!session || session.expires_at < new Date()) {
      // If expired, clear the cookie
      res.clearCookie('consultantToken');

      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please login again.',
      });
      return;
    }

    const consultant = session.consultant;

    if (!consultant || consultant.status !== 'ACTIVE') {
      res.status(401).json({ success: false, error: 'Consultant not active or found' });
      return;
    }

    req.consultant = {
      id: consultant.id,
      email: consultant.email,
      firstName: consultant.first_name,
      lastName: consultant.last_name,
      role: consultant.role
    };

    next();
  } catch (error) {
    console.error('[authenticateConsultant] Error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}
