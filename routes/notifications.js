import express from 'express';
import { getNotifications } from '../controllers/notificationController.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.use(auth);
router.get('/', getNotifications);

export default router;
