import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/connection.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import demoRoutes from './routes/demo.js';
import priorityRoutes from './routes/priorities.js';
import festivalRoutes from './routes/festivals.js';
import strategistRoutes from './routes/strategist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Trust proxy for Vercel / Cloud Run
app.set('trust proxy', 1);

// ─── Rate Limiting ───────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, error: 'AI rate limit reached. Please wait a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── CORS ────────────────────────────────────────────────────
const buildAllowedOrigins = (): string[] => {
  const origins: string[] = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ];
  if (process.env.FRONTEND_URL) origins.push(process.env.FRONTEND_URL);
  if (process.env.CORS_ORIGINS) {
    process.env.CORS_ORIGINS.split(',').forEach(o => origins.push(o.trim()));
  }
  return origins.filter(Boolean);
};

app.use(limiter);
app.use(cors({
  origin: (origin, callback) => {
    const allowed = buildAllowedOrigins();
    // Allow Vercel preview deployments
    const isVercelPreview = origin && /^https:\/\/tradiq-zium[\w-]*\.vercel\.app$/.test(origin);
    if (!origin || allowed.includes(origin) || isVercelPreview) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    app: 'Tradiq Zium GrowthOS',
    version: '1.0.0',
    gemini: !!process.env.GEMINI_API_KEY,
    database: !!process.env.DATABASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// ─── Database init middleware ─────────────────────────────────
// Ensures DB is ready before processing API requests
app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();
  try {
    await initDatabase();
    next();
  } catch (err: any) {
    console.error('[DB] Init failed for path:', req.path, err.message);
    res.status(503).json({
      success: false,
      error: 'Database unavailable',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', authenticate, productRoutes);
app.use('/api/demo', authenticate, demoRoutes);
app.use('/api/priorities', authenticate, priorityRoutes);
app.use('/api/festivals', authenticate, festivalRoutes);
app.use('/api/strategist', authenticate, strategistRoutes);

// Protected routes (added in later phases)
// app.use('/api/business', authenticate, businessRoutes);
// app.use('/api/campaigns', authenticate, campaignRoutes);
// app.use('/api/assets', authenticate, assetRoutes);
// app.use('/api/seo', authenticate, seoRoutes);
// app.use('/api/metrics', authenticate, metricsRoutes);
// app.use('/api/insights', authenticate, insightsRoutes);

// Serve static client in production / Docker
if (process.env.NODE_ENV === 'production' || process.env.SERVE_CLIENT === 'true') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Global Error Handler ──────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[Error]', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─── Export for Vercel Serverless ─────────────────────────────
export default app;

// Make AI rate limiter available for route registration
export { aiLimiter };

// ─── Start Server (Local / Docker) ───────────────────────────
async function start() {
  // Fail loudly if DATABASE_URL is missing
  if (!process.env.DATABASE_URL) {
    console.error('[FATAL] DATABASE_URL is not set. Cannot start without a database.');
    process.exit(1);
  }
  await initDatabase();
  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`[GrowthOS] Server running on port ${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  start().catch(err => {
    console.error('[FATAL] Failed to start:', err);
    process.exit(1);
  });
}
