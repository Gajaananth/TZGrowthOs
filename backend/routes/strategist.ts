import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getApproachingFestivals } from '../lib/scoring.js';
import { thinkJSON } from '../services/ai/thinkJSON.js';

const router = Router();

async function getBusinessForUser(userId: string) {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM businesses WHERE user_id = $1 LIMIT 1', [userId]);
  return res.rows[0] || null;
}

// ─── GET /api/strategist/plan ─────────────────────────────────
router.get('/plan', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessForUser(req.user!.userId);
    if (!business) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();

    // 1. Fetch top priority products
    const prioritiesRes = await pool.query(
      `SELECT DISTINCT ON (pp.product_id)
        pp.product_id,
        pp.priority,
        pp.score,
        pp.reasons,
        pp.festival_boost,
        p.name AS product_name,
        p.category,
        p.price_lkr,
        p.cost_lkr,
        p.stock_qty,
        p.is_demo
       FROM product_priorities pp
       JOIN products p ON p.id = pp.product_id
       WHERE p.business_id = $1
       ORDER BY pp.product_id, pp.generated_at DESC`,
      [business.id]
    );

    const sortedPriorities = prioritiesRes.rows.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    const topPromote = sortedPriorities.filter((p) => p.priority === 'PROMOTE_MORE').slice(0, 3);

    // 2. Fetch approaching festivals
    const festivalsRes = await pool.query('SELECT * FROM festivals ORDER BY year ASC, date ASC');
    const approachingFestivals = getApproachingFestivals(festivalsRes.rows);

    // 3. Fetch inventory alerts (low stock < 10 or out of stock)
    const inventoryAlertsRes = await pool.query(
      `SELECT id, name, category, stock_qty, price_lkr
       FROM products
       WHERE business_id = $1 AND stock_qty <= 10
       ORDER BY stock_qty ASC
       LIMIT 5`,
      [business.id]
    );

    // 4. Fetch pending campaign approvals
    const pendingCampaignsRes = await pool.query(
      `SELECT c.id, c.objective, c.status, p.name AS product_name
       FROM campaigns c
       JOIN products p ON p.id = c.product_id
       WHERE c.business_id = $1 AND c.status = 'IN_REVIEW'
       LIMIT 5`,
      [business.id]
    );

    // 5. Total catalog metrics
    const catalogSummaryRes = await pool.query(
      `SELECT
        COUNT(*)::int AS total_products,
        COALESCE(SUM(stock_qty * price_lkr), 0)::numeric AS total_catalog_value_lkr
       FROM products
       WHERE business_id = $1`,
      [business.id]
    );

    // 6. Generate prioritized actions for today using Gemini AI if available
    let nextActions: Array<{ id: string; category: string; title: string; description: string; actionUrl: string }> = [];

    if (process.env.GEMINI_API_KEY) {
      try {
        const topProdNames = sortedPriorities.slice(0, 3).map(p => `${p.product_name} (${p.priority}, Margin: ${p.score}/100)`).join(', ');
        const festNames = approachingFestivals.slice(0, 2).map(f => `${f.name_en} (in ${f.days_until} days, boosts: ${(f.categories_boosted || []).join(', ')})`).join('; ');
        const stockAlerts = inventoryAlertsRes.rows.slice(0, 2).map(r => `${r.name} (${r.stock_qty} left)`).join(', ');

        const aiActions = await thinkJSON<{
          nextActions: Array<{ category: string; title: string; description: string; actionUrl?: string }>
        }>({
          prompt: `You are the GrowthOS Chief Strategy Officer advising "${business.name}" in ${business.city || 'Sri Lanka'}.
Store Context:
- Priority Scored Items: ${topProdNames || 'None yet'}
- Upcoming Festivals: ${festNames || 'None in immediate window'}
- Low Stock Alerts: ${stockAlerts || 'None'}
- Total Products: ${catalogSummaryRes.rows[0]?.total_products || 0}

Generate 3 high-impact, tactical actions this retailer must execute today.
For actionUrl, choose the best matching app route:
- To create a campaign for a product: "/campaigns/new"
- To score or review product margins: "/priorities"
- To manage stock or catalog: "/products"
- To review holidays: "/festivals"
- To consult the AI strategist: "/chat"

Return strictly JSON matching:
{
  "nextActions": [
    {
      "category": "Promotion | Inventory | Cultural Calendar | Analysis",
      "title": "Concise actionable title",
      "description": "1-2 sentences with concrete reasoning grounded in the store's data",
      "actionUrl": "/campaigns/new"
    }
  ]
}`,
          schema: z.object({
            nextActions: z.array(z.object({
              id: z.string().optional().default(() => 'act_' + Math.random().toString(36).substring(2, 7)),
              category: z.string(),
              title: z.string(),
              description: z.string(),
              actionUrl: z.string().optional().default('/campaigns/new'),
            })).min(1).transform(a => a.slice(0, 3)),
          }),
          featureName: 'growth_plan_strategist',
          userId: req.user!.userId,
          temperature: 0.5,
        });

        nextActions = aiActions.nextActions.map((a, idx) => ({
          id: a.id || `ai_act_${idx}`,
          category: a.category,
          title: a.title,
          description: a.description,
          actionUrl: a.actionUrl || '/campaigns/new',
        }));
      } catch (aiErr: any) {
        console.warn('[Strategist] Gemini plan generation failed, using structured fallback:', aiErr.message);
      }
    }

    if (nextActions.length === 0) {
      if (topPromote.length > 0) {
        const topP = topPromote[0];
        nextActions.push({
          id: 'action-promote-top',
          category: 'Promotion',
          title: `Promote Top Margin Hero: ${topP.product_name}`,
          description: `Ranked #1 with score ${topP.score}/100. High profit potential for ${business.name}.`,
          actionUrl: `/campaigns/new?productId=${topP.product_id}`,
        });
      } else {
        nextActions.push({
          id: 'action-generate-priorities',
          category: 'Analysis',
          title: 'Run AI Product Priority Scoring',
          description: 'Compute mathematical priority scores across margins and stock velocity.',
          actionUrl: '/priorities',
        });
      }

      if (approachingFestivals.length > 0) {
        const topFest = approachingFestivals[0];
        nextActions.push({
          id: 'action-festival-prep',
          category: 'Cultural Calendar',
          title: `Prepare for ${topFest.name_en}`,
          description: topFest.date_confirmed
            ? `Confirmed date approaching in ${topFest.days_until} days. Boost categories: ${(topFest.categories_boosted || []).slice(0, 3).join(', ')}.`
            : `Date requires verification. Confirm official holiday date in festival settings.`,
          actionUrl: '/festivals',
        });
      }

      if (inventoryAlertsRes.rows.length > 0) {
        const lowest = inventoryAlertsRes.rows[0];
        nextActions.push({
          id: 'action-stock-alert',
          category: 'Inventory',
          title: `Restock Warning: ${lowest.name}`,
          description: lowest.stock_qty <= 0
            ? `Currently out of stock! Restock immediately to prevent lost retail revenue.`
            : `Only ${lowest.stock_qty} units remaining. Contact supplier before running promotions.`,
          actionUrl: '/products',
        });
      }
    }

    res.json({
      success: true,
      plan: {
        storeName: business.name,
        city: business.city,
        totalProducts: catalogSummaryRes.rows[0]?.total_products || 0,
        totalCatalogValue: catalogSummaryRes.rows[0]?.total_catalog_value_lkr || 0,
        topPromoteProducts: topPromote,
        approachingFestivals,
        inventoryAlerts: inventoryAlertsRes.rows,
        pendingApprovalsCount: pendingCampaignsRes.rows.length,
        nextActions,
      },
    });
  } catch (err: any) {
    console.error('[Strategist] Plan error:', err);
    res.status(500).json({ success: false, error: 'Failed to load growth plan', details: err.message });
  }
});

export default router;
