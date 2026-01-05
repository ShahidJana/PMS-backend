import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import activityRoutes from './routes/activity.js';
import analyticsRoutes from './routes/analytics.js';
import dashboardRoutes from './routes/dashboard.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { csrfTokenMiddleware, csrfProtection } from './middlewares/csrf.js';

dotenv.config();

const app = express();
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(csrfTokenMiddleware); // Generate CSRF token for all requests
app.use('/api', apiLimiter);

app.get('/', (req, res) => res.send('Backend is running 🚀'));

// Public routes (no CSRF protection needed for initial auth)
app.use('/api/auth', authRoutes);

// Protected API routes (CSRF protection applied)
app.use('/api', csrfProtection);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  const uri = process.env.MONGO_URI
  await mongoose.connect(uri, { dbName: process.env.DB_NAME || undefined });
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
