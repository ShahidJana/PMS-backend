import crypto from 'crypto';

// In-memory store for CSRF tokens 
const csrfTokens = new Map();

// Clean up expired tokens every hour
setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of csrfTokens.entries()) {
        if (now > expiry) {
            csrfTokens.delete(token);
        }
    }
}, 3600000);

/* Generate a CSRF token and store it */
export function generateCsrfToken() {
    const token = crypto.randomBytes(32).toString('hex');
    // Token expires in 1 hour
    csrfTokens.set(token, Date.now() + 3600000);
    return token;
}

/* Middleware to generate and send CSRF token */

export function csrfTokenMiddleware(req, res, next) {
    const token = generateCsrfToken();
    // Send token as a cookie (not HTTP-only so JavaScript can read it)
    res.cookie('XSRF-TOKEN', token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
    });
    next();
}

/* Middleware to verify CSRF token Expects token in X-XSRF-TOKEN header
 */
export function csrfProtection(req, res, next) {
    // Skip CSRF protection for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const token = req.headers['x-xsrf-token'];

    if (!token) {
        return res.status(403).json({ message: 'CSRF token missing' });
    }

    // Verify token exists and hasn't expired
    const expiry = csrfTokens.get(token);
    if (!expiry || Date.now() > expiry) {
        return res.status(403).json({ message: 'Invalid or expired CSRF token' });
    }

    next();
}
