import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models';
import { verifyToken, extractTokenFromHeader, JwtPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userId?: string;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    const decoded: JwtPayload = verifyToken(token);
    
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
};

export const optionalAuthenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = extractTokenFromHeader(authHeader);
    const decoded: JwtPayload = verifyToken(token);
    
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (user) {
      req.user = user;
      req.userId = user._id;
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    next();
  }
};

export const requireSubscription = (minTier: 'pro' | 'premium') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const tierLevels = { free: 0, pro: 1, premium: 2 };
    const userLevel = tierLevels[req.user.subscriptionTier];
    const requiredLevel = tierLevels[minTier];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        message: `${minTier} subscription required for this feature`,
        upgradeRequired: true,
        currentTier: req.user.subscriptionTier,
        requiredTier: minTier
      });
      return;
    }

    next();
  };
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // For now, we don't have roles in the user model
    // This is a placeholder for future role-based authorization
    next();
  };
};