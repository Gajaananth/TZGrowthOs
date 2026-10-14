import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = (process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Cannot connect to database.');
  }

  const isVercel = !!process.env.VERCEL;
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const useSsl = !isLocal && (connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co') || isVercel);

  pool = new Pool({
    connectionString,
    max: isVercel ? 5 : 20,
    idleTimeoutMillis: isVercel ? 5000 : 30000,
    connectionTimeoutMillis: 10000,
    ssl: useSsl ? { rejectUnauthorized: process.env.NODE_ENV === 'production' && !connectionString.includes('neon.tech') } : false,
  });

  pool.on('error', (err) => {
    console.error('[DB] Pool error:', err.message);
  });

  return pool;
}

async function initDatabase(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log('[DB] Connecting...');
    const db = getPool();
    const client = await db.connect();

    try {
      await client.query("SET client_encoding TO 'UTF8'");
      await runMigrations(client);
      isInitialized = true;
      console.log('[DB] Ready.');
    } catch (err: any) {
      initPromise = null;
      throw new Error(`Database initialization failed: ${err.message}`);
    } finally {
      client.release();
    }
  })();

  return initPromise;
}

async function runMigrations(client: any): Promise<void> {
  // Advisory lock to prevent concurrent migrations
  let lockAcquired = false;
  try {
    const lockRes = await client.query('SELECT pg_try_advisory_lock(42001) as got_lock');
    lockAcquired = lockRes.rows[0]?.got_lock;

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- ---------------------------------------------------
      -- Users & Auth
      -- ---------------------------------------------------
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ---------------------------------------------------
      -- Business Profile
      -- ---------------------------------------------------
      CREATE TABLE IF NOT EXISTS businesses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        business_type TEXT NOT NULL DEFAULT 'retail',
        city TEXT NOT NULL DEFAULT '',
        default_language TEXT NOT NULL DEFAULT 'en',
        brand_tone TEXT NOT NULL DEFAULT 'friendly',
        goals TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id);

      -- ---------------------------------------------------
      -- Products & Sales
      -- ---------------------------------------------------
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        price_lkr NUMERIC(12, 2) NOT NULL,
        cost_lkr NUMERIC(12, 2),
        stock_qty INTEGER NOT NULL DEFAULT 0,
        description TEXT DEFAULT '',
        image_url TEXT,
        is_demo BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);

      CREATE TABLE IF NOT EXISTS sales_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        units_sold INTEGER NOT NULL DEFAULT 0,
        revenue_lkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
        is_demo BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE INDEX IF NOT EXISTS idx_sales_product ON sales_records(product_id);

      -- ---------------------------------------------------
      -- Product Priorities
      -- ---------------------------------------------------
      CREATE TABLE IF NOT EXISTS product_priorities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        priority TEXT NOT NULL CHECK (priority IN ('PROMOTE_MORE', 'MAINTAIN', 'REDUCE')),
        score NUMERIC(8, 2) NOT NULL DEFAULT 0,
        reasons JSONB NOT NULL DEFAULT '[]',
        data_used JSONB NOT NULL DEFAULT '{}',
        data_missing JSONB NOT NULL DEFAULT '[]',
        festival_boost JSONB,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_priorities_product ON product_priorities(product_id);

      -- ---------------------------------------------------
      -- Festivals
      -- ---------------------------------------------------
      CREATE TABLE IF NOT EXISTS festivals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_si TEXT NOT NULL DEFAULT '',
        name_ta TEXT NOT NULL DEFAULT '',
        year INTEGER NOT NULL,
        date DATE,
        date_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
        lead_days INTEGER NOT NULL DEFAULT 14,
        categories_boosted JSONB NOT NULL DEFAULT '[]',
        sensitivity_rules JSONB NOT NULL DEFAULT '[]',
        source_note TEXT DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_festivals_year ON festivals(year);

      -- ---------------------------------------------------
      -- Campaigns & Content
      -- ---------------------------------------------------
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        festival_id UUID REFERENCES festivals(id) ON DELETE SET NULL,
        objective TEXT NOT NULL DEFAULT 'awareness',
        platforms JSONB NOT NULL DEFAULT '["facebook"]',
        status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
        is_demo BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        approved_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_campaigns_business ON campaigns(business_id);

      CREATE TABLE IF NOT EXISTS content_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        asset_type TEXT NOT NULL CHECK (asset_type IN (
          'CAPTION', 'HASHTAGS', 'CTA', 'POSTER_CONCEPT', 'VIDEO_SCRIPT',
          'CALENDAR_ITEM', 'PRODUCT_DESCRIPTION', 'AUDIENCE_VARIATION',
          'OFFER_IDEA', 'IMAGE_PROMPT'
        )),
        platform TEXT,
        language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'si', 'ta', 'singlish', 'tanglish')),
        body TEXT NOT NULL DEFAULT '',
        needs_native_review BOOLEAN NOT NULL DEFAULT TRUE,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_assets_campaign ON content_assets(campaign_id);

      -- ---------------------------------------------------
      -- SEO
      -- ---------------------------------------------------
      CREATE TABLE IF NOT EXISTS seo_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        page_title TEXT DEFAULT '',
        meta_description TEXT DEFAULT '',
        improved_description TEXT DEFAULT '',
        keywords JSONB NOT NULL DEFAULT '[]',
        headings JSONB NOT NULL DEFAULT '[]',
        image_alt_text TEXT DEFAULT '',
        internal_links JSONB NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'generated',
        language TEXT NOT NULL DEFAULT 'en',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_seo_product ON seo_recommendations(product_id);

      -- ---------------------------------------------------
      -- Campaign Metrics & Insights
      -- ---------------------------------------------------
      CREATE TABLE IF NOT EXISTS campaign_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        reach INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        engagement INTEGER DEFAULT 0,
        link_clicks INTEGER DEFAULT 0,
        leads INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        sales_lkr NUMERIC(12, 2),
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        is_demo BOOLEAN NOT NULL DEFAULT FALSE,
        source TEXT DEFAULT 'manual'
      );
      CREATE INDEX IF NOT EXISTS idx_metrics_campaign ON campaign_metrics(campaign_id);

      CREATE TABLE IF NOT EXISTS performance_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        summary TEXT NOT NULL DEFAULT '',
        findings JSONB NOT NULL DEFAULT '[]',
        next_actions JSONB NOT NULL DEFAULT '[]',
        generated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ---------------------------------------------------
      -- Approval Audit Trail
      -- ---------------------------------------------------
      CREATE TABLE IF NOT EXISTS approval_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        note TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_approval_campaign ON approval_events(campaign_id);

      -- ---------------------------------------------------
      -- AI Run Logging
      -- ---------------------------------------------------
      CREATE TABLE IF NOT EXISTS ai_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        feature TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT '',
        latency_ms INTEGER NOT NULL DEFAULT 0,
        success BOOLEAN NOT NULL DEFAULT TRUE,
        tokens_in INTEGER,
        tokens_out INTEGER,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_runs_feature ON ai_runs(feature);
    `);

    console.log('[DB] Migrations complete.');
  } finally {
    if (lockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock(42001)');
      } catch (e) {
        console.error('[DB] Failed to release advisory lock:', e);
      }
    }
  }
}

export { getPool, initDatabase };
export default { getPool, initDatabase };
