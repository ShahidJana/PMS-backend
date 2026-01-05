import Task from '../models/Task.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import mongoose from 'mongoose';

export async function getAnalytics(req, res) {
    try {
        // 1. Tasks completed per user (only from non-deleted projects)
        const tasksPerUser = await Task.aggregate([
            { $match: { status: 'done', assignee: { $exists: true, $ne: null }, deleted: false } },
            {
                $lookup: {
                    from: 'projects',
                    localField: 'project',
                    foreignField: '_id',
                    as: 'projectInfo'
                }
            },
            { $unwind: '$projectInfo' },
            { $match: { 'projectInfo.deleted': false } },
            {
                $group: {
                    _id: '$assignee',
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    name: '$user.name',
                    count: 1,
                    _id: 0
                }
            }
        ]);

        // 2. Project progress %
        const projectProgress = await Task.aggregate([
            { $match: { deleted: false } },
            {
                $group: {
                    _id: '$project',
                    totalTasks: { $sum: 1 },
                    completedTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
                    }
                }
            },
            {
                $lookup: {
                    from: 'projects',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'projectInfo'
                }
            },
            { $unwind: '$projectInfo' },
            { $match: { 'projectInfo.deleted': false } },
            {
                $project: {
                    title: '$projectInfo.title',
                    progress: {
                        $multiply: [
                            { $divide: ['$completedTasks', { $cond: [{ $eq: ['$totalTasks', 0] }, 1, '$totalTasks'] }] },
                            100
                        ]
                    },
                    total: '$totalTasks',
                    completed: '$completedTasks',
                    _id: 0
                }
            }
        ]);

        // 3. Weekly performance (Last 8 weeks, from non-deleted projects)
        const weeklyPerformance = await Task.aggregate([
            {
                $match: {
                    status: 'done',
                    deleted: false,
                    updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 60)) }
                }
            },
            {
                $lookup: {
                    from: 'projects',
                    localField: 'project',
                    foreignField: '_id',
                    as: 'projectInfo'
                }
            },
            { $unwind: '$projectInfo' },
            { $match: { 'projectInfo.deleted': false } },
            {
                $group: {
                    _id: {
                        year: { $year: '$updatedAt' },
                        week: { $week: '$updatedAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.week': 1 } },
            {
                $project: {
                    week: { $concat: ['Week ', { $toString: '$_id.week' }] },
                    completed: '$count',
                    _id: 0
                }
            }
        ]);

        res.json({
            tasksPerUser,
            projectProgress,
            weeklyPerformance
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Analytics error' });
    }
}
