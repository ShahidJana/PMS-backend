import { verifyAccess } from '../utils/jwtService.js';
import User from '../models/User.js';

export default async function auth(req, res, next) {
  try {
    // Read token from HTTP-only cookie instead of Authorization header
    const token = req.cookies.access_token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const payload = verifyAccess(token);
    const user = await User.findById(payload.id).exec();
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized', error: err.message });
  }
}
