import jwt from 'jsonwebtoken';
import { IUser } from '../models';

export interface JwtPayload {
  id: string;
  username: string;
  email: string;
  subscriptionTier: string;
}

export const generateToken = (user: IUser): string => {
  const payload: JwtPayload = {
    id: user._id,
    username: user.username,
    email: user.email,
    subscriptionTier: user.subscriptionTier
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
    issuer: 'blueprint-xyz',
    audience: 'blueprint-xyz-users'
  } as jwt.SignOptions);
};

export const generateRefreshToken = (user: IUser): string => {
  const payload = {
    id: user._id,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
    issuer: 'blueprint-xyz',
    audience: 'blueprint-xyz-users'
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'blueprint-xyz',
      audience: 'blueprint-xyz-users'
    }) as JwtPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

export const verifyRefreshToken = (token: string): { id: string; type: string } => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
      issuer: 'blueprint-xyz',
      audience: 'blueprint-xyz-users'
    }) as { id: string; type: string };
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
};

export const extractTokenFromHeader = (authHeader: string | undefined): string => {
  if (!authHeader) {
    throw new Error('No authorization header provided');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header format');
  }

  const token = authHeader.substring(7);
  if (!token) {
    throw new Error('No token provided');
  }

  return token;
};