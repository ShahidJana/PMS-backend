import express from 'express';
import { getDashboardOverview } from '../controllers/dashboardController.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.get('/overview', auth, getDashboardOverview);

export default router;
