import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request type to include session
declare module 'express-serve-static-core' {
  interface Request {
    session: {
      csrfToken?: string;
      [key: string]: any;
    };
  }
}

export const generateCsrfToken = (req: Request): string => {
  if (!req.session) {
    (req as any).session = {};
  }
  
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  
  return req.session.csrfToken;
};

export const validateCsrfToken = (req: Request): boolean => {
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  return token && token === req.session?.csrfToken;
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (!validateCsrfToken(req)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
    });
  }

  next();
};