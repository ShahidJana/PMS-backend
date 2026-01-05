import ActivityLog from '../models/ActivityLog.js';

export async function listActivity(req, res) {
  const q = {};
  if (req.query.actor) q.actor = req.query.actor;
  const logs = await ActivityLog.find(q).sort({ createdAt: -1 }).limit(500).exec();
  res.json(logs);
}
