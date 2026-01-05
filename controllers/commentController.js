import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import TaskReadStatus from '../models/TaskReadStatus.js';

export async function listComments(req, res) {
    try {
        const comments = await Comment.find({ task: req.params.taskId })
            .populate('author', 'name email')
            .sort({ createdAt: -1 })
            .exec();

        // Update Read Status for the user
        await TaskReadStatus.findOneAndUpdate(
            { user: req.user._id, task: req.params.taskId },
            { lastReadAt: new Date() },
            { upsert: true, new: true }
        );

        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function addComment(req, res) {
    try {
        const { content } = req.body;
        const comment = await Comment.create({
            content,
            task: req.params.taskId,
            author: req.user._id
        });

        const populated = await comment.populate('author', 'name email');

        // Increment commentsCount on Task and update latestCommentAt
        await Task.findByIdAndUpdate(req.params.taskId, {
            $inc: { commentsCount: 1 },
            latestCommentAt: new Date()
        });

        // Activity Log
        await ActivityLog.create({
            actor: req.user._id,
            action: 'add_comment',
            resourceType: 'Task',
            resourceId: req.params.taskId,
            meta: { content: content.substring(0, 50) }
        });

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function deleteComment(req, res) {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        // Only author or admin can delete
        if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await Comment.findByIdAndDelete(req.params.id);

        // Decrement commentsCount on Task
        await Task.findByIdAndUpdate(comment.task, { $inc: { commentsCount: -1 } });

        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
