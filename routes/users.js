import express from 'express';
import auth from '../middlewares/auth.js';
import requireRole from '../middlewares/roles.js';
import { listUsers, getUser, updateUser, assignRole, deleteUser, toggleBlockStatus } from '../controllers/userController.js';

const router = express.Router();

router.use(auth);
router.get('/', requireRole(['admin', 'pm']), listUsers);
router.get('/:id', requireRole('admin'), getUser);
router.patch('/:id', requireRole('admin'), updateUser);
router.post('/:id/role', requireRole('admin'), assignRole);
router.post('/:id/block', requireRole('admin'), toggleBlockStatus);
router.delete('/:id', requireRole('admin'), deleteUser);

export default router;
