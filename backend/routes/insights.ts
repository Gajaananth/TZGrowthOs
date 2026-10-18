/**
 * Phase 5 – Insights Route
 * GET /api/insights/summary  → Business health dashboard metrics
 */
import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

async function getBusiness(userId: string) {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM businesses WHERE user_id = $1 LIMIT 1', [userId]);
  return r.rows[0] || null;
}

// ─── GET /api/insights/summary ────────────────────────────────
router.get('/summary', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusiness(req.user!.userId);
    if (!business) { res.status(404).json({ success: false, error: 'Business not found' }); return; }

    const pool = getPool();
    const bid = business.id;

    // ── Catalog metrics ──────────────────────────────────────
    const catalogRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total_products,
        COALESCE(SUM(stock_qty), 0)::int AS total_stock_units,
        COALESCE(SUM(stock_qty * price_lkr), 0)::numeric AS catalog_value_lkr,
        COUNT(CASE WHEN stock_qty = 0 THEN 1 END)::int AS out_of_stock_count,
        COUNT(CASE WHEN stock_qty <= 5 AND stock_qty > 0 THEN 1 END)::int AS low_stock_count
      FROM products WHERE business_id = $1`, [bid]);

    // ── Campaign metrics ──────────────────────────────────────
    const campaignRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total_campaigns,
        COUNT(CASE WHEN status='APPROVED' THEN 1 END)::int AS approved_count,
        COUNT(CASE WHEN status='IN_REVIEW' THEN 1 END)::int AS in_review_count,
        COUNT(CASE WHEN status='DRAFT' THEN 1 END)::int AS draft_count,
        COUNT(CASE WHEN status='REJECTED' THEN 1 END)::int AS rejected_count
      FROM campaigns WHERE business_id = $1`, [bid]);

    // ── AI & Token usage telemetry ───────────────────────────
    const aiRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total_ai_calls,
        COUNT(CASE WHEN success THEN 1 END)::int AS successful_calls,
        COALESCE(SUM(tokens_in), 0)::int AS total_tokens_in,
        COALESCE(SUM(tokens_out), 0)::int AS total_tokens_out,
        COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS total_tokens,
        ROUND(COALESCE(AVG(latency_ms), 0))::int AS avg_latency_ms
      FROM ai_runs
      WHERE (user_id = $1 OR user_id IS NULL)
    `, [req.user!.userId]).catch(() => ({ rows: [{ total_ai_calls: 0, successful_calls: 0, total_tokens_in: 0, total_tokens_out: 0, total_tokens: 0, avg_latency_ms: 0 }] }));

    const aiFeaturesRes = await pool.query(`
      SELECT
        feature,
        COUNT(*)::int AS call_count,
        COALESCE(SUM(tokens_in), 0)::int AS tokens_in,
        COALESCE(SUM(tokens_out), 0)::int AS tokens_out,
        COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS total_tokens,
        ROUND(COALESCE(AVG(latency_ms), 0))::int AS avg_latency_ms
      FROM ai_runs
      WHERE (user_id = $1 OR user_id IS NULL)
      GROUP BY feature
      ORDER BY total_tokens DESC
    `, [req.user!.userId]).catch(() => ({ rows: [] }));

    const recentAiRunsRes = await pool.query(`
      SELECT
        id,
        feature,
        model,
        latency_ms,
        success,
        COALESCE(tokens_in, 0)::int AS tokens_in,
        COALESCE(tokens_out, 0)::int AS tokens_out,
        (COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0))::int AS total_tokens,
        error_message,
        created_at
      FROM ai_runs
      WHERE (user_id = $1 OR user_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 15
    `, [req.user!.userId]).catch(() => ({ rows: [] }));

    // ── Priority distribution ─────────────────────────────────
    const priorityRes = await pool.query(`
      SELECT
        pp.priority,
        COUNT(*)::int AS count
      FROM product_priorities pp
      JOIN products p ON p.id = pp.product_id
      WHERE p.business_id = $1
        AND pp.generated_at = (
          SELECT MAX(pp2.generated_at) FROM product_priorities pp2 WHERE pp2.product_id = pp.product_id
        )
      GROUP BY pp.priority`, [bid]).catch(() => ({ rows: [] }));

    // ── Top products by score ─────────────────────────────────
    const topProductsRes = await pool.query(`
      SELECT DISTINCT ON (pp.product_id)
        p.name AS product_name,
        p.category,
        p.price_lkr,
        p.stock_qty,
        pp.priority,
        pp.score,
        pp.reasons
      FROM product_priorities pp
      JOIN products p ON p.id = pp.product_id
      WHERE p.business_id = $1
      ORDER BY pp.product_id, pp.generated_at DESC`, [bid])
      .then(r => r.rows.sort((a: any, b: any) => parseFloat(b.score) - parseFloat(a.score)).slice(0, 5))
      .catch(() => []);

    // ── Content assets generated ──────────────────────────────
    const assetsRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total_assets,
        COUNT(CASE WHEN asset_type='CAPTION' THEN 1 END)::int AS captions,
        COUNT(CASE WHEN is_confirmed THEN 1 END)::int AS confirmed
      FROM content_assets ca
      JOIN campaigns c ON c.id = ca.campaign_id
      WHERE c.business_id = $1`, [bid]).catch(() => ({ rows: [{ total_assets: 0, captions: 0, confirmed: 0 }] }));

    // ── Recent approved campaigns ─────────────────────────────
    const recentApprovedRes = await pool.query(`
      SELECT c.id, c.objective, c.platforms, c.approved_at, p.name AS product_name, p.category,
        (SELECT COUNT(*)::int FROM content_assets ca WHERE ca.campaign_id = c.id) AS asset_count
      FROM campaigns c
      JOIN products p ON p.id = c.product_id
      WHERE c.business_id = $1 AND c.status = 'APPROVED'
      ORDER BY c.approved_at DESC
      LIMIT 5`, [bid]).catch(() => ({ rows: [] }));

    const catalog = catalogRes.rows[0] || {};
    const campaigns = campaignRes.rows[0] || {};
    const assets = assetsRes.rows[0] || {};

    const priorityDist: Record<string, number> = {};
    for (const row of priorityRes.rows) {
      priorityDist[row.priority] = row.count;
    }

    const aiMetrics = aiRes.rows[0] || { total_ai_calls: 0, successful_calls: 0, total_tokens_in: 0, total_tokens_out: 0, total_tokens: 0, avg_latency_ms: 0 };
    const aiFeatureBreakdown: Record<string, number> = {};
    for (const row of aiFeaturesRes.rows) {
      aiFeatureBreakdown[row.feature] = row.call_count;
    }

    res.json({
      success: true,
      summary: {
        business: { name: business.name, city: business.city, type: business.type },
        catalog: {
          totalProducts: catalog.total_products || 0,
          totalStockUnits: catalog.total_stock_units || 0,
          catalogValueLkr: parseFloat(catalog.catalog_value_lkr) || 0,
          outOfStockCount: catalog.out_of_stock_count || 0,
          lowStockCount: catalog.low_stock_count || 0,
        },
        campaigns: {
          total: campaigns.total_campaigns || 0,
          approved: campaigns.approved_count || 0,
          inReview: campaigns.in_review_count || 0,
          draft: campaigns.draft_count || 0,
          rejected: campaigns.rejected_count || 0,
        },
        assets: {
          total: assets.total_assets || 0,
          captions: assets.captions || 0,
          confirmed: assets.confirmed || 0,
        },
        ai: {
          totalCallsLast30Days: aiMetrics.total_ai_calls,
          successfulCalls: aiMetrics.successful_calls,
          totalTokensIn: aiMetrics.total_tokens_in,
          totalTokensOut: aiMetrics.total_tokens_out,
          totalTokens: aiMetrics.total_tokens,
          avgLatencyMs: aiMetrics.avg_latency_ms,
          featureBreakdown: aiFeatureBreakdown,
          featuresDetailed: aiFeaturesRes.rows,
          recentRuns: recentAiRunsRes.rows,
        },
        priorities: {
          distribution: priorityDist,
          topProducts: topProductsRes,
        },
        recentApproved: recentApprovedRes.rows,
      },
    });
  } catch (err: any) {
    console.error('[Insights] Summary error:', err);
    res.status(500).json({ success: false, error: 'Failed to load insights', details: err.message });
  }
});

// ─── GET /api/insights/tokens ─────────────────────────────────
router.get('/tokens', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    const userId = req.user!.userId;

    const statsRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total_calls,
        COUNT(CASE WHEN success THEN 1 END)::int AS successful_calls,
        COALESCE(SUM(tokens_in), 0)::int AS total_tokens_in,
        COALESCE(SUM(tokens_out), 0)::int AS total_tokens_out,
        COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS total_tokens,
        ROUND(COALESCE(AVG(latency_ms), 0))::int AS avg_latency_ms
      FROM ai_runs
      WHERE (user_id = $1 OR user_id IS NULL)
    `, [userId]);

    const featureRes = await pool.query(`
      SELECT
        feature,
        COUNT(*)::int AS calls,
        COALESCE(SUM(tokens_in), 0)::int AS tokens_in,
        COALESCE(SUM(tokens_out), 0)::int AS tokens_out,
        COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0)::int AS total_tokens,
        ROUND(COALESCE(AVG(latency_ms), 0))::int AS avg_latency_ms
      FROM ai_runs
      WHERE (user_id = $1 OR user_id IS NULL)
      GROUP BY feature
      ORDER BY total_tokens DESC
    `, [userId]);

    const recentRes = await pool.query(`
      SELECT
        id,
        feature,
        model,
        latency_ms,
        success,
        COALESCE(tokens_in, 0)::int AS tokens_in,
        COALESCE(tokens_out, 0)::int AS tokens_out,
        (COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0))::int AS total_tokens,
        error_message,
        created_at
      FROM ai_runs
      WHERE (user_id = $1 OR user_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 25
    `, [userId]);

    const stats = statsRes.rows[0] || {};
    // Gemini 2.0 Flash pricing: $0.10/1M prompt tokens, $0.40/1M completion tokens
    // Converted to approximate LKR (1 USD ~ 310 LKR)
    const costUsd = ((stats.total_tokens_in || 0) * 0.0000001) + ((stats.total_tokens_out || 0) * 0.0000004);
    const costLkr = costUsd * 310;

    res.json({
      success: true,
      tokens: {
        totalCalls: stats.total_calls || 0,
        successfulCalls: stats.successful_calls || 0,
        totalTokensIn: stats.total_tokens_in || 0,
        totalTokensOut: stats.total_tokens_out || 0,
        totalTokens: stats.total_tokens || 0,
        avgLatencyMs: stats.avg_latency_ms || 0,
        costUsd: Number(costUsd.toFixed(6)),
        costLkr: Number(costLkr.toFixed(2)),
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        byFeature: featureRes.rows,
        recentRuns: recentRes.rows,
      },
    });
  } catch (err: any) {
    console.error('[Insights] Token usage error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch token usage', details: err.message });
  }
});

export default router;
