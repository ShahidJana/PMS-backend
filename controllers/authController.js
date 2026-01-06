import User from '../models/User.js';
import Token from '../models/Token.js';
import { signAccess, signRefresh, verifyRefresh } from '../utils/jwtService.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { withTransaction } from '../utils/mongooseTransaction.js';

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email }).exec();
    if (existing) return res.status(409).json({ message: 'Email already exists' });
    const hashed = await hashPassword(password);
    const user = await User.create({ name, email, password: hashed });
    const access = signAccess({ id: user._id });
    const refresh = signRefresh({ id: user._id });

    // Create token with metadata
    await Token.create({
      user: user._id,
      token: refresh,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    setTokenCookies(res, access, refresh);

    res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Check if user is blocked
    if (user.blocked) {
      return res.status(403).json({
        message: 'Your account has been blocked by an administrator. Please contact support for assistance.',
        blocked: true
      });
    }

    const ok = await comparePassword(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid password' });
    const access = signAccess({ id: user._id });
    const refresh = signRefresh({ id: user._id });

    // Create token with metadata
    await Token.create({
      user: user._id,
      token: refresh,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    setTokenCookies(res, access, refresh);

    res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function refreshToken(req, res) {
  try {
    const refresh = req.cookies.refresh_token;
    if (!refresh) return res.status(400).json({ message: 'Refresh token required' });

    const payload = verifyRefresh(refresh);
    const tokenEntry = await Token.findOne({ token: refresh }).exec();

    // 1. REUSE DETECTION
    // If we find a token that is already revoked, it means someone is trying to reuse an old token.
    // This could indicate a theft. We revoke ALL tokens for this user for safety.
    if (tokenEntry && tokenEntry.revoked) {
      await Token.updateMany({ user: payload.id }, { revoked: true, revokedAt: new Date() });
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      return res.status(403).json({ message: 'Potential token reuse detected. All sessions invalidated.' });
    }

    if (!tokenEntry) return res.status(401).json({ message: 'Invalid refresh token' });

    // 2. TOKEN ROTATION
    const newAccess = signAccess({ id: payload.id });
    const newRefresh = signRefresh({ id: payload.id });

    await withTransaction(async (session) => {
      tokenEntry.revoked = true;
      tokenEntry.revokedAt = new Date();
      tokenEntry.replacedByToken = newRefresh;
      await tokenEntry.save({ session });

      await Token.create([{
        user: payload.id,
        token: newRefresh,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }], { session });
    });

    setTokenCookies(res, newAccess, newRefresh);

    res.json({ message: 'Token refreshed successfully' });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token', error: err.message });
  }
}

// Helper to set secure cookies
function setTokenCookies(res, access, refresh) {
  res.cookie('access_token', access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refresh_token', refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 3600 * 1000 // 7 days
  });
}

export async function logout(req, res) {
  try {
    // Get refresh token from cookie instead of body
    const refresh = req.cookies.refresh_token;
    if (refresh) {
      const tokenEntry = await Token.findOne({ token: refresh }).exec();
      if (tokenEntry) {
        tokenEntry.revoked = true;
        tokenEntry.revokedAt = new Date();
        await tokenEntry.save();
      }
    }

    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
