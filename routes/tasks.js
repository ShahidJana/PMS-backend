import express from 'express';
import auth from '../middlewares/auth.js';
import requireRole from '../middlewares/roles.js';
import { listTasks, getTask, createTask, updateTask, changeStatus, deleteTask, assignTask } from '../controllers/taskController.js';
import { listComments, addComment, deleteComment } from '../controllers/commentController.js';

const router = express.Router();
router.use(auth);

router.get('/', listTasks);
router.post('/', requireRole('admin', 'pm'), createTask);
router.get('/:id', getTask);
router.patch('/:id', requireRole('admin', 'pm'), updateTask);
router.post('/:id/status', changeStatus);
router.put('/:id/assign', requireRole('admin', 'pm'), assignTask);
router.delete('/:id', requireRole('admin', 'pm'), deleteTask);

// Comments
router.get('/:taskId/comments', listComments);
router.post('/:taskId/comments', addComment);
router.delete('/comments/:id', deleteComment);

export default router;
