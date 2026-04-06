import crypto from 'crypto';
export const generateCsrfToken = (req) => {
    if (!req.session) {
        req.session = {};
    }
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    return req.session.csrfToken;
};
export const validateCsrfToken = (req) => {
    const token = req.headers['x-csrf-token'] || req.body?._csrf;
    if (!req.session?.csrfToken) {
        // CSRF token support is optional; if session-based CSRF is not configured,
        // don't block state-changing requests.
        return true;
    }
    return token && token === req.session?.csrfToken;
};
export const csrfProtection = (req, res, next) => {
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
//# sourceMappingURL=csrfMiddleware.js.map