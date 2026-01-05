import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';

export async function listProjects(req, res) {
  const projects = await Project.find().limit(200).exec();
  res.json(projects);
}

export async function getProject(req, res) {
  const project = await Project.findById(req.params.id).exec();
  if (!project) return res.status(404).json({ message: 'Not found' });
  res.json(project);
}

export async function createProject(req, res) {
  const payload = { ...req.body, owner: req.user._id };
  const project = await Project.create(payload);
  await ActivityLog.create({ actor: req.user._id, action: 'create_project', resourceType: 'Project', resourceId: project._id });
  res.status(201).json(project);
}

export async function updateProject(req, res) {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true }).exec();
  if (project) await ActivityLog.create({ actor: req.user._id, action: 'update_project', resourceType: 'Project', resourceId: project._id });
  res.json(project || { message: 'Not found' });
}

export async function deleteProject(req, res) {
  const project = await Project.findById(req.params.id).exec();
  if (!project) return res.status(404).json({ message: 'Not found' });

  // Soft-delete the project
  await project.softDelete(req.user._id);

  // Cascade soft-delete to all tasks in this project
  const tasks = await Task.find({ project: project._id }).exec();
  for (const task of tasks) {
    await task.softDelete(req.user._id);
  }

  await ActivityLog.create({ actor: req.user._id, action: 'delete_project', resourceType: 'Project', resourceId: project._id });
  res.json({ message: 'Deleted' });
}
