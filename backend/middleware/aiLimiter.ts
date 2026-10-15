import rateLimit from 'express-rate-limit';

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, error: 'AI rate limit reached. Please wait a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
