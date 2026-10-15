import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export interface UserPayload {
  userId: string;
  email: string;
  role?: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authorization token required' });
    return;
  }

  const token = authHeader.substring(7).trim();
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as UserPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function signToken(payload: UserPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

