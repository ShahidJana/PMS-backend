import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import TaskReadStatus from '../models/TaskReadStatus.js';

export async function listTasks(req, res) {
  const filter = { ...(req.query.project ? { project: req.query.project } : {}) };
  const tasks = await Task.find(filter)
    .populate('assignee', 'name email role')
    .populate('project', 'title')
    .limit(500)
    .exec();

  const readStatuses = await TaskReadStatus.find({ user: req.user._id }).exec();
  const readStatusMap = new Map(readStatuses.map(rs => [rs.task.toString(), rs.lastReadAt]));

  const tasksWithReadStatus = tasks.map(task => {
    const taskObj = task.toObject();
    const lastReadAt = readStatusMap.get(task._id.toString());

    taskObj.hasUnreadComments = false;
    if (task.commentsCount > 0) {
      if (!lastReadAt) {
        taskObj.hasUnreadComments = true;
      } else if (task.latestCommentAt && new Date(task.latestCommentAt) > new Date(lastReadAt)) {
        taskObj.hasUnreadComments = true;
      }
    }
    return taskObj;
  });

  res.json(tasksWithReadStatus);
}

export async function getTask(req, res) {
  const task = await Task.findById(req.params.id).exec();
  if (!task) return res.status(404).json({ message: 'Not found' });
  res.json(task);
}

export async function createTask(req, res) {
  const payload = { ...req.body };
  const task = (await Task.create(payload));
  const populated = await Task.findById(task._id).populate('project', 'title').exec();

  await ActivityLog.create({
    actor: req.user._id,
    action: 'create_task',
    resourceType: 'Task',
    resourceId: task._id,
    meta: {
      title: task.title,
      projectTitle: populated.project?.title,
      status: task.status
    }
  });
  res.status(201).json(populated);
}

export async function updateTask(req, res) {
  const task = await Task.findById(req.params.id).exec();
  if (!task) return res.status(404).json({ message: 'Not found' });

  // Only admin can edit tasks in 'done' status
  if (task.status === 'done' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only an Administrator can edit tasks that are DONE!' });
  }

  const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true }).exec();
  if (updatedTask) {
    // Prevent duplicate update logging (5s window)
    const recentLog = await ActivityLog.findOne({
      actor: req.user._id,
      action: 'update_task',
      resourceId: updatedTask._id,
      createdAt: { $gt: new Date(Date.now() - 5000) }
    }).exec();

    if (!recentLog) {
      await ActivityLog.create({
        actor: req.user._id,
        action: 'update_task',
        resourceType: 'Task',
        resourceId: updatedTask._id,
        meta: { title: updatedTask.title }
      });
    }
  }
  res.json(updatedTask || { message: 'Not found' });
}

export async function changeStatus(req, res) {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id).exec();

    if (!task) return res.status(404).json({ message: 'Not found' });

    // Authorization: Admin, PM, or the person assigned to the task
    const isAuthorized =
      req.user.role === 'admin' ||
      req.user.role === 'pm' ||
      (task.assignee && task.assignee.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You can only move tasks assigned to you' });
    }

    // Restriction: Only Admin can move tasks out of Done or Blocked
    if ((task.status === 'done' || task.status === 'blocked') && req.user.role !== 'admin') {
      return res.status(403).json({ message: `Only an Administrator can move tasks out of the ${task.status.toUpperCase()} state!` });
    }

    task.status = status;
    await task.save();

    // Prevent duplicate logging within a short window (5s)
    const recentLog = await ActivityLog.findOne({
      actor: req.user._id,
      action: 'change_status',
      resourceId: task._id,
      createdAt: { $gt: new Date(Date.now() - 5000) }
    }).exec();

    if (!recentLog) {
      await ActivityLog.create({
        actor: req.user._id,
        action: 'change_status',
        resourceType: 'Task',
        resourceId: task._id,
        meta: { status, title: task.title }
      });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function deleteTask(req, res) {
  const task = await Task.findById(req.params.id).exec();
  if (!task) return res.status(404).json({ message: 'Not found' });

  // Only admin can delete tasks in 'done' status
  if (task.status === 'done' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only an Administrator can delete tasks that are DONE!' });
  }

  await task.softDelete(req.user._id);
  await ActivityLog.create({
    actor: req.user._id,
    action: 'delete_task',
    resourceType: 'Task',
    resourceId: task._id,
    meta: { title: task.title }
  });
  res.json({ message: 'Deleted' });
}

export async function assignTask(req, res) {
  const { assigneeId } = req.body;
  const task = await Task.findById(req.params.id).exec();

  if (!task) return res.status(404).json({ message: 'Task not found' });

  // Custom restriction: Only admins can change assignee if task is In Progress or Done
  if ((task.status === 'in-progress' || task.status === 'done') && req.user.role !== 'admin') {
    return res.status(403).json({ message: `Only an Administrator can change assignees for tasks that are ${task.status.toUpperCase()}!` });
  }

  task.assignee = assigneeId;
  await task.save();

  const populated = await Task.findById(task._id)
    .populate('assignee', 'name email role')
    .populate('project', 'title')
    .exec();

  if (populated) {
    // Prevent duplicate assignment logging (5s window)
    const recentLog = await ActivityLog.findOne({
      actor: req.user._id,
      action: 'assign_task',
      resourceId: populated._id,
      createdAt: { $gt: new Date(Date.now() - 5000) }
    }).exec();

    if (!recentLog) {
      await ActivityLog.create({
        actor: req.user._id,
        action: 'assign_task',
        resourceType: 'Task',
        resourceId: populated._id,
        meta: {
          assigneeId,
          title: populated.title,
          projectTitle: populated.project?.title,
          assigneeName: populated.assignee?.name
        }
      });
    }
  }
  res.json(populated || { message: 'Not found' });
}
