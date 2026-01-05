import express from 'express';
import { body } from 'express-validator';
import { register, login, refreshToken, logout } from '../controllers/authController.js';
import validate from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', authLimiter, [body('email').isEmail(), body('password').isLength({ min: 8 }), body('name').isLength({ min: 2 })], validate, register);
router.post('/login', authLimiter, [body('email').isEmail(), body('password').exists()], validate, login);
router.post('/refresh', authLimiter, refreshToken);
router.post('/logout', authLimiter, logout);

// return currently authenticated user
router.get('/me', auth, (req, res) => {
	const u = req.user;
	res.json({ id: u._id, email: u.email, name: u.name, role: u.role });
});

export default router;
