import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';

export async function listUsers(req, res) {
  const users = await User.find().limit(100).select('-password').exec();
  res.json(users);
}

export async function getUser(req, res) {
  const user = await User.findById(req.params.id).select('-password').exec();
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
}

export async function updateUser(req, res) {
  const updates = req.body;
  if (updates.password) delete updates.password; // change via dedicated endpoint
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password').exec();
  if (user) await ActivityLog.create({ actor: req.user._id, action: 'update_user', resourceType: 'User', resourceId: user._id });
  res.json(user || { message: 'Not found' });
}

export async function assignRole(req, res) {
  const { role } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password').exec();
  if (user) await ActivityLog.create({ actor: req.user._id, action: 'assign_role', resourceType: 'User', resourceId: user._id, meta: { role } });
  res.json(user || { message: 'Not found' });
}

export async function deleteUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.role === 'admin') {
    return res.status(403).json({ message: 'Administrators cannot be deleted for security reasons.' });
  }

  await user.softDelete(req.user._id);
  await ActivityLog.create({ actor: req.user._id, action: 'delete_user', resourceType: 'User', resourceId: user._id, meta: { name: user.name } });
  res.json({ success: true });
}

export async function toggleBlockStatus(req, res) {
  const { blocked } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) return res.status(404).json({ message: 'User not found' });

  // Prevent blocking admins - strictly enforced
  if (user.role === 'admin') {
    return res.status(403).json({ message: 'Administrators cannot be blocked.' });
  }

  user.blocked = blocked;
  await user.save();

  await ActivityLog.create({
    actor: req.user._id,
    action: blocked ? 'block_user' : 'unblock_user',
    resourceType: 'User',
    resourceId: user._id,
    meta: { name: user.name, blocked }
  });

  res.json({
    message: `User ${blocked ? 'blocked' : 'unblocked'} successfully`,
    user: { id: user._id, blocked: user.blocked }
  });
}
