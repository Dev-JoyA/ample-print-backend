import { Request, Response, NextFunction } from "express";

export const securityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.removeHeader("X-Powered-By");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );

  const suspiciousPatterns = [
    /['"`;]?\s*OR\s*['"`;]?\s*1\s*=\s*1/i,
    /\$\{.*?\}/i,
    /\.\.\/|\.\.\\/i,
    /<script/i,
  ];

  const url = req.url.toLowerCase();
  const body = JSON.stringify(req.body).toLowerCase();

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(body)) {
      console.warn("⚠️ Suspicious request detected:", {
        ip: req.ip,
        method: req.method,
        url: req.url,
        body: req.body,
      });
      break;
    }
  }

  next();
};
