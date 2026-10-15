import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

function cleanConnectionString(raw: string): string {
  let str = (raw || '').trim();
  // Strip surrounding quotes
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  // Strip accidental prefix if user pasted the key name too
  if (str.startsWith('DATABASE_URL=')) {
    str = str.slice('DATABASE_URL='.length).trim();
  }
  // Strip psql prefix if copied from CLI instructions
  if (str.startsWith('psql ')) {
    str = str.replace(/^psql\s+['"]?/, '').replace(/['"]?$/, '').trim();
  }
  return str;
}

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = cleanConnectionString(process.env.DATABASE_URL || '');
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Cannot connect to database.');
  }

  const isVercel = !!process.env.VERCEL;
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const useSsl = !isLocal && (connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co') || connectionString.includes('supabase.com') || isVercel);

  pool = new Pool({
    connectionString,
    max: isVercel ? 5 : 20,
    idleTimeoutMillis: isVercel ? 5000 : 30000,
    connectionTimeoutMillis: 10000,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
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

    // Seed canonical festivals (independent of demo data)
    await seedFestivals(client);
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

/**
 * Seed the 10 canonical Sri Lankan festivals at startup if they don't exist.
 * Dates are NULL and date_confirmed=false (unconfirmed) except Christmas (Dec 25, confirmed).
 * Owners must confirm actual dates via the Festivals UI before use.
 */
async function seedFestivals(client: any): Promise<void> {
  const year = new Date().getFullYear();

  const festivals = [
    {
      key: 'sinhala_new_year',
      name_en: 'Sinhala & Tamil New Year (Avurudu)',
      name_si: 'සිංහල හා දෙමළ නව වර්ෂය',
      name_ta: 'சிங்கள தமிழ் புத்தாண்டு',
      date: null,
      date_confirmed: false,
      lead_days: 21,
      categories_boosted: ['food', 'clothing', 'gifts', 'sweets', 'household'],
      sensitivity_rules: ['Avoid competitive messaging', 'Celebrate cultural unity'],
      source_note: 'Traditionally April 13-14. Owner must confirm exact date.',
    },
    {
      key: 'vesak',
      name_en: 'Vesak Poya',
      name_si: 'වෙසක් පෝය',
      name_ta: 'வெசாக் பூஜை',
      date: null,
      date_confirmed: false,
      lead_days: 14,
      categories_boosted: ['lanterns', 'food', 'religious items', 'flowers'],
      sensitivity_rules: ['No alcohol or meat promotions', 'Use respectful religious tone'],
      source_note: 'Full moon day in May. Owner must confirm exact date.',
    },
    {
      key: 'poson',
      name_en: 'Poson Poya',
      name_si: 'පොසොන් පෝය',
      name_ta: 'பொசொன் பூஜை',
      date: null,
      date_confirmed: false,
      lead_days: 10,
      categories_boosted: ['food', 'religious items', 'white clothing'],
      sensitivity_rules: ['No alcohol promotions', 'Respectful Buddhist tone'],
      source_note: 'Full moon in June. Owner must confirm exact date.',
    },
    {
      key: 'ramadan',
      name_en: 'Ramadan',
      name_si: 'රමදාන්',
      name_ta: 'ரமலான்',
      date: null,
      date_confirmed: false,
      lead_days: 21,
      categories_boosted: ['food', 'clothing', 'dates', 'gifts'],
      sensitivity_rules: ['Avoid alcohol/pork messaging', 'Use respectful Islamic tone', 'Promote pre-dawn and iftar offers'],
      source_note: 'Lunar calendar — date varies yearly. Owner must confirm.',
    },
    {
      key: 'eid_al_fitr',
      name_en: 'Eid al-Fitr',
      name_si: 'ඊද් අල්-ෆිතර්',
      name_ta: 'ஈத் உல் பித்ர்',
      date: null,
      date_confirmed: false,
      lead_days: 14,
      categories_boosted: ['clothing', 'food', 'gifts', 'sweets'],
      sensitivity_rules: ['Respectful Islamic messaging', 'Celebrate end of fasting'],
      source_note: 'End of Ramadan. Owner must confirm exact date.',
    },
    {
      key: 'eid_al_adha',
      name_en: 'Eid al-Adha',
      name_si: 'ඊද් අල්-අද්හා',
      name_ta: 'ஈத் உல் அது',
      date: null,
      date_confirmed: false,
      lead_days: 14,
      categories_boosted: ['meat', 'clothing', 'gifts'],
      sensitivity_rules: ['Respectful Islamic messaging', 'Avoid insensitive content'],
      source_note: 'Feast of Sacrifice. Owner must confirm exact date.',
    },
    {
      key: 'deepavali',
      name_en: 'Deepavali (Diwali)',
      name_si: 'දීපාවලී',
      name_ta: 'தீபாவளி',
      date: null,
      date_confirmed: false,
      lead_days: 14,
      categories_boosted: ['gifts', 'sweets', 'clothing', 'lighting', 'jewellery'],
      sensitivity_rules: ['Celebrate light and prosperity', 'Respectful Hindu messaging'],
      source_note: 'Hindu lunar calendar — date varies. Owner must confirm.',
    },
    {
      key: 'thai_pongal',
      name_en: 'Thai Pongal',
      name_si: 'තායිපොංගල්',
      name_ta: 'தைப்பொங்கல்',
      date: null,
      date_confirmed: false,
      lead_days: 10,
      categories_boosted: ['food', 'rice', 'sugarcane', 'household'],
      sensitivity_rules: ['Celebrate Tamil harvest festival', 'Respectful tone'],
      source_note: 'Traditionally January 14. Owner must confirm exact date.',
    },
    {
      key: 'christmas',
      name_en: 'Christmas',
      name_si: 'නත්තල්',
      name_ta: 'கிறிஸ்துமஸ்',
      date: `${year}-12-25`,
      date_confirmed: true,
      lead_days: 21,
      categories_boosted: ['gifts', 'food', 'clothing', 'electronics', 'toys', 'decorations'],
      sensitivity_rules: ['Inclusive messaging for all communities', 'Festive and joyful tone'],
      source_note: 'Fixed date: December 25.',
    },
    {
      key: 'back_to_school',
      name_en: 'Back to School Season',
      name_si: 'පාසල් ආරම්භය',
      name_ta: 'பள்ளி திறப்பு',
      date: null,
      date_confirmed: false,
      lead_days: 14,
      categories_boosted: ['stationery', 'clothing', 'bags', 'shoes', 'electronics'],
      sensitivity_rules: ['Focus on value and quality for families'],
      source_note: 'Typically January and September in Sri Lanka. Owner must confirm.',
    },
  ];

  for (const f of festivals) {
    const existing = await client.query(
      'SELECT id FROM festivals WHERE key = $1 AND year = $2 LIMIT 1',
      [f.key, year]
    );
    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO festivals (key, name_en, name_si, name_ta, year, date, date_confirmed, lead_days, categories_boosted, sensitivity_rules, source_note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11)`,
        [
          f.key,
          f.name_en,
          f.name_si,
          f.name_ta,
          year,
          f.date || null,
          f.date_confirmed,
          f.lead_days,
          JSON.stringify(f.categories_boosted),
          JSON.stringify(f.sensitivity_rules),
          f.source_note,
        ]
      );
      console.log(`[DB] Seeded festival: ${f.name_en}`);
    }
  }
}

export { getPool, initDatabase };
export default { getPool, initDatabase };
