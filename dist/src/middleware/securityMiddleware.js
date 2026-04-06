export const securityMiddleware = (req, res, next) => {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    // Add security headers not covered by helmet
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // Log suspicious requests
    const suspiciousPatterns = [
        /['"`;]?\s*OR\s*['"`;]?\s*1\s*=\s*1/i, // SQL injection
        /\$\{.*?\}/i, // Template injection
        /\.\.\/|\.\.\\/i, // Path traversal
        /<script/i, // XSS
    ];
    const url = req.url.toLowerCase();
    const body = JSON.stringify(req.body).toLowerCase();
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(url) || pattern.test(body)) {
            console.warn('⚠️ Suspicious request detected:', {
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
//# sourceMappingURL=securityMiddleware.js.map