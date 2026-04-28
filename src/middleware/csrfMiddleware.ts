import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare module "express-serve-static-core" {
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
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  return req.session.csrfToken;
};

export const validateCsrfToken = (req: Request): boolean => {
  const token = req.headers["x-csrf-token"] || req.body?._csrf;
  if (!req.session?.csrfToken) {
    return true;
  }
  return token && token === req.session?.csrfToken;
};

export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  if (!validateCsrfToken(req)) {
    return res.status(403).json({
      success: false,
      message: "Invalid CSRF token",
    });
  }

  next();
};
