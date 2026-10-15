import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET?.trim()) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

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
import campaignRoutes from './routes/campaigns.js';
import assetRoutes from './routes/assets.js';
import seoRoutes from './routes/seo.js';
import insightsRoutes from './routes/insights.js';
import chatRoutes from './routes/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

import { aiLimiter } from './middleware/aiLimiter.js';

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
app.use('/api/campaigns', campaignRoutes);   // Phase 4: auth handled inside router
app.use('/api/assets', assetRoutes);         // Phase 4: auth handled inside router
app.use('/api/seo', seoRoutes);              // Phase 5: auth handled inside router
app.use('/api/insights', insightsRoutes);    // Phase 5: auth handled inside router
app.use('/api/chat', chatRoutes);            // Phase 5: auth handled inside router

// ─── Serve static client in production / Docker ──────────────────
if (process.env.NODE_ENV === 'production' || process.env.SERVE_CLIENT === 'true') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));

  // Catch unmatched API routes with 404 JSON before falling through to SPA index.html
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  });

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

// ─── Start Server (Local / Docker / Cloud Run) ────────────────
async function start() {
  // Validate all required environment variables
  const missingEnv: string[] = [];
  if (!process.env.JWT_SECRET?.trim()) missingEnv.push('JWT_SECRET');
  if (!process.env.DATABASE_URL?.trim()) missingEnv.push('DATABASE_URL');
  if (!process.env.GEMINI_API_KEY?.trim()) missingEnv.push('GEMINI_API_KEY');

  if (missingEnv.length > 0) {
    console.error(`[FATAL] Missing required environment variable(s): ${missingEnv.join(', ')}`);
    console.error('[FATAL] Please define them in .env or your Cloud Run service environment.');
    process.exit(1);
  }

  await initDatabase();

  if (!process.env.VERCEL) {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[GrowthOS] Server running on http://0.0.0.0:${PORT} (PID: ${process.pid})`);
    });

    // Graceful shutdown handling for Cloud Run & container orchestrators
    const handleShutdown = (signal: string) => {
      console.log(`[GrowthOS] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('[GrowthOS] HTTP server closed.');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('[GrowthOS] Forced shutdown after timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  }
}

if (!process.env.VERCEL) {
  start().catch(err => {
    console.error('[FATAL] Failed to start:', err);
    process.exit(1);
  });
}
