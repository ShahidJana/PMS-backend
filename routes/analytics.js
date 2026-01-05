import express from 'express';
import { getAnalytics } from '../controllers/analyticsController.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

// Only allow authenticated users to see analytics
router.get('/', auth, getAnalytics);

export default router;
