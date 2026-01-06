import Project from '../models/Project.js';
import Task from '../models/Task.js';

export async function getNotifications(req, res) {
    try {
        const notifications = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Task Due Date Alerts (For all users, specific to their tasks)
        // "show his task due date before 1 and 2 days"
        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(today.getDate() + 2);
        twoDaysFromNow.setHours(23, 59, 59, 999); // End of the 2nd day

        const myTasks = await Task.find({
            assignee: req.user._id,
            dueDate: { $gte: today, $lte: twoDaysFromNow },
            status: { $ne: 'done' },
            deleted: false
        });

        myTasks.forEach(task => {
            const daysLeft = Math.ceil((new Date(task.dueDate) - today) / (1000 * 60 * 60 * 24));
            let msg = `Task "${task.title}" is due in ${daysLeft} days`;
            if (daysLeft <= 0) msg = `Task "${task.title}" is due today`;
            if (daysLeft === 1) msg = `Task "${task.title}" is due tomorrow`;

            notifications.push({
                id: `task-${task._id}`,
                type: 'task-alert',
                message: msg,
                timestamp: new Date(),
                read: false,
                urgent: daysLeft <= 1
            });
        });

        // 2. Project Due Dates (Admin & PM only)
        // "admin and project manager show there project due dates before 15 days"
        // "project manager to show there own task due dates and projects due date which projects create or added by own"
        if (['admin', 'pm'].includes(req.user.role)) {
            const fifteenDaysLater = new Date(today);
            fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);
            fifteenDaysLater.setHours(23, 59, 59, 999);

            const projQuery = {
                dueDate: { $gte: today, $lte: fifteenDaysLater },
                deleted: false
            };

            // PM restriction: "projects create or added by own"
            if (req.user.role === 'pm') {
                projQuery.owner = req.user._id;
            }
            // Admin sees all expiring projects (implied by "admin... show there project due dates", and admins usually own the system)

            const expProjects = await Project.find(projQuery);

            expProjects.forEach(proj => {
                const daysLeft = Math.ceil((new Date(proj.dueDate) - today) / (1000 * 60 * 60 * 24));

                notifications.push({
                    id: `proj-${proj._id}`,
                    type: 'project-alert',
                    message: `Project "${proj.title}" is due in ${daysLeft} days`,
                    timestamp: new Date(), // Real-time alert
                    read: false,
                    urgent: daysLeft <= 3
                });
            });
        }

        // Sort: Urgent first, then by date (though all are 'today' generated alerts, consistent sort helps)
        notifications.sort((a, b) => (b.urgent === a.urgent ? 0 : b.urgent ? 1 : -1));

        res.json(notifications);
    } catch (e) {
        console.error('Notification fetch error:', e);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
}
