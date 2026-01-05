import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Increased from 20 to prevent 429s during active usage/dev
  message: { message: 'Too many requests, please try again later.' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { message: 'Too many requests, please slow down.' },
});
