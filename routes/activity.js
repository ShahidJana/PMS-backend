import express from 'express';
import auth from '../middlewares/auth.js';
import { listActivity } from '../controllers/activityController.js';

const router = express.Router();
router.use(auth);

router.get('/', listActivity);

export default router;
