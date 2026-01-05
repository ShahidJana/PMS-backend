export default function requireRole(...allowed) {
  const roles = Array.isArray(allowed[0]) ? allowed[0] : allowed;
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
