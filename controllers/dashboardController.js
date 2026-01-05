import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';

export async function getDashboardOverview(req, res) {
    try {
        const user = req.user;
        const stats = {};

        if (user.role === 'admin') {
            stats.totalUsers = await User.countDocuments({ deleted: false });
            stats.totalProjects = await Project.countDocuments({ deleted: false });
            stats.totalTasks = await Task.countDocuments({ deleted: false });
            stats.blockedTasks = await Task.countDocuments({ status: 'blocked', deleted: false });

            // Get projects with task stats using Aggregation Pipeline
            const projectStats = await Project.aggregate([
                { $match: { deleted: false } },
                {
                    $lookup: {
                        from: 'tasks',
                        let: { projectId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$project', '$$projectId'] },
                                    deleted: false
                                }
                            }
                        ],
                        as: 'tasks'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        let: { ownerId: '$owner' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$ownerId'] },
                                    deleted: false
                                }
                            }
                        ],
                        as: 'owner'
                    }
                },
                { $unwind: '$owner' },
                {
                    $addFields: {
                        totalTasks: { $size: '$tasks' },
                        completedTasks: {
                            $size: {
                                $filter: {
                                    input: '$tasks',
                                    as: 'task',
                                    cond: { $eq: ['$$task.status', 'done'] }
                                }
                            }
                        },
                        assigneeIds: {
                            $filter: {
                                input: { $setUnion: '$tasks.assignee' },
                                as: 'id',
                                cond: { $ne: ['$$id', null] }
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        let: { assignees: '$assigneeIds' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $in: ['$_id', '$$assignees'] },
                                    deleted: false
                                }
                            }
                        ],
                        as: 'assignees'
                    }
                },
                {
                    $project: {
                        title: 1,
                        description: 1,
                        startDate: 1,
                        dueDate: 1,
                        meta: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        owner: { _id: 1, name: 1 },
                        totalTasks: 1,
                        completedTasks: 1,
                        assignees: { _id: 1, name: 1, email: 1 },
                        progress: {
                            $cond: [
                                { $gt: ['$totalTasks', 0] },
                                { $round: [{ $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] }] },
                                0
                            ]
                        }
                    }
                }
            ]);
            stats.projects = projectStats;

            stats.recentActivity = await ActivityLog.find()
                .populate('actor', 'name role')
                .sort({ createdAt: -1 })
                .limit(15)
                .exec();
        } else if (user.role === 'pm') {
            // Projects owned or where user is a member
            const projects = await Project.find({
                $or: [{ owner: user._id }, { members: user._id }]
            });
            const projectIds = projects.map(p => p._id);

            stats.ownedProjects = projects.length;
            stats.activeTasks = await Task.countDocuments({
                project: { $in: projectIds },
                status: { $in: ['todo', 'in-progress'] },
                deleted: false
            });
            stats.blockedTasks = await Task.countDocuments({
                project: { $in: projectIds },
                status: 'blocked',
                deleted: false
            });
            stats.completedTasks = await Task.countDocuments({
                project: { $in: projectIds },
                status: 'done',
                deleted: false
            });
            stats.recentActivity = await ActivityLog.find()
                .populate('actor', 'name role')
                .sort({ createdAt: -1 })
                .limit(15)
                .exec();
        } else {
            // Team Member
            let assignedTasksList = await Task.find({ assignee: user._id }).populate('project', '_id');
            // Filter out tasks where project is deleted (project becomes null due to soft delete plugin on populate)
            assignedTasksList = assignedTasksList.filter(t => t.project !== null);

            const completedCount = assignedTasksList.filter(t => t.status === 'done').length;

            stats.assignedTasks = assignedTasksList.length - completedCount;
            stats.completedTasks = completedCount;
            stats.overallProgress = assignedTasksList.length > 0
                ? Math.round((completedCount / assignedTasksList.length) * 100)
                : 0;

            let upcomingTasks = await Task.find({
                assignee: user._id,
                status: { $ne: 'done' }
            })
                .populate('project', 'title')
                .sort({ dueDate: 1 })
                .limit(20) // Fetch more to allow filtering
                .exec();

            stats.upcomingTasks = upcomingTasks.filter(t => t.project !== null).slice(0, 10);
        }

        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Dashboard data error' });
    }
}
