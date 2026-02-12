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

    // Verify consultant session first
    const session = token ? await prisma.consultantSession.findUnique({
      where: { session_id: token },
      include: { consultant: true },
    }) : null;

    if (session && session.expires_at >= new Date()) {
      const consultant = session.consultant;
      if (!consultant || consultant.status !== 'ACTIVE') {
        // Consultant found but inactive
        res.status(401).json({ success: false, error: 'Consultant not active' });
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
      return;
    }

    // If not a valid Consultant session, check for Admin Session (Bypass for HRM8 Admins)
    // We check this if 'token' is present (passed as Bearer) OR if there is an hrm8SessionId cookie
    const adminToken = token || (req.cookies && req.cookies.hrm8SessionId);

    if (adminToken) {
      const adminSession = await prisma.session.findUnique({
        where: { session_id: adminToken },
        include: { user: true }
      });

      if (adminSession && adminSession.expires_at >= new Date()) {
        // Admin found - Enable Bypass
        // Find a real consultant to masquerade as (for data context) or create dummy
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
          const [firstName, ...lastNameParts] = (adminSession.user.name || 'Admin User').split(' ');
          req.consultant = {
            id: adminSession.user.id,
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

    // Attempted both, failed
    if (session) {
      // Session existed but expired (handled in first block, but here means expired)
      res.clearCookie('consultantToken');
      res.status(401).json({ success: false, error: 'Session expired' });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Not authenticated. Please login.',
    });
    return;


  } catch (error) {
    console.error('[authenticateConsultant] Error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Strict consultant auth - NO admin bypass. Use for financial routes (earnings, balance, withdraw)
 * to prevent admin accidentally viewing another consultant's financial data.
 */
export async function authenticateConsultantStrict(
  req: ConsultantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader?.startsWith('Bearer ')) token = authHeader.split(' ')[1];
  else if (req.cookies?.consultantToken) token = req.cookies.consultantToken;

  if (!token) {
    res.status(401).json({ success: false, error: 'Consultant login required' });
    return;
  }

  const session = await prisma.consultantSession.findUnique({
    where: { session_id: token },
    include: { consultant: true },
  });

  if (session && session.expires_at >= new Date()) {
    const consultant = session.consultant;
    if (!consultant || consultant.status !== 'ACTIVE') {
      res.status(401).json({ success: false, error: 'Consultant not active' });
      return;
    }
    req.consultant = {
      id: consultant.id,
      email: consultant.email,
      firstName: consultant.first_name,
      lastName: consultant.last_name,
      role: consultant.role,
    };
    next();
    return;
  }

  res.status(401).json({ success: false, error: 'Session expired or invalid' });
}
