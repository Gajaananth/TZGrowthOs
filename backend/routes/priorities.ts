import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimiter.js';
import { calculateProductScore, getApproachingFestivals, ScoringResult } from '../lib/scoring.js';
import { thinkJSON } from '../services/ai/thinkJSON.js';
import {
  buildPriorityReasoningPrompt,
  PriorityReasoningResponseSchema,
  PriorityReasoningResponse,
} from '../prompts/priorities.js';

const router = Router();

async function getBusinessForUser(userId: string) {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM businesses WHERE user_id = $1 LIMIT 1', [userId]);
  return res.rows[0] || null;
}

// ─── GET /api/priorities ───────────────────────────────────────
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessForUser(req.user!.userId);
    if (!business) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();
    const query = `
      SELECT DISTINCT ON (pp.product_id)
        pp.id AS priority_id,
        pp.product_id,
        pp.priority,
        pp.score,
        pp.reasons,
        pp.data_used,
        pp.data_missing,
        pp.festival_boost,
        pp.generated_at,
        p.name AS product_name,
        p.category,
        p.price_lkr,
        p.cost_lkr,
        p.stock_qty,
        p.is_demo,
        p.description
      FROM product_priorities pp
      JOIN products p ON p.id = pp.product_id
      WHERE p.business_id = $1
      ORDER BY pp.product_id, pp.generated_at DESC;
    `;

    const result = await pool.query(query, [business.id]);

    // Sort by score descending
    const sorted = result.rows.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    res.json({
      success: true,
      priorities: sorted,
    });
  } catch (err: any) {
    console.error('[Priorities] Get error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch priorities', details: err.message });
  }
});

// ─── POST /api/priorities/generate ────────────────────────────
router.post('/generate', authenticate, aiLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessForUser(req.user!.userId);
    if (!business) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();

    // 1. Fetch products with sales metrics
    const productsRes = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.category,
        p.price_lkr,
        p.cost_lkr,
        p.stock_qty,
        p.is_demo,
        COALESCE(SUM(s.units_sold), 0)::int AS total_units_sold,
        COALESCE(SUM(s.revenue_lkr), 0)::numeric AS total_revenue_lkr
       FROM products p
       LEFT JOIN sales_records s ON s.product_id = p.id
       WHERE p.business_id = $1
       GROUP BY p.id`,
      [business.id]
    );

    if (productsRes.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No products in catalog. Please add products or seed the demo catalog first.',
      });
      return;
    }

    // 2. Fetch all festivals and find approaching ones
    const festivalsRes = await pool.query('SELECT * FROM festivals ORDER BY year ASC, date ASC');
    const approachingFestivals = getApproachingFestivals(festivalsRes.rows);

    // 3. Deterministic scoring for all products
    const productsWithScores = productsRes.rows.map((p) => {
      const scoreResult = calculateProductScore(
        {
          id: p.id,
          name: p.name,
          category: p.category,
          price_lkr: parseFloat(p.price_lkr),
          cost_lkr: p.cost_lkr !== null ? parseFloat(p.cost_lkr) : null,
          stock_qty: p.stock_qty || 0,
          total_units_sold: p.total_units_sold || 0,
          total_revenue_lkr: parseFloat(p.total_revenue_lkr || '0'),
        },
        approachingFestivals
      );
      return {
        ...p,
        scoreResult,
      };
    });

    // 4. Generate AI explanations using Gemini thinkJSON
    let reasonsMap: Record<string, { reasons: string[]; recommended_action?: string }> = {};

    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = buildPriorityReasoningPrompt({
          businessName: business.name,
          city: business.city,
          productsWithScores,
        });

        const aiOutput = await thinkJSON<PriorityReasoningResponse>({
          prompt,
          schema: PriorityReasoningResponseSchema,
          featureName: 'product_priorities',
          userId: req.user!.userId,
        });

        for (const item of aiOutput.items) {
          reasonsMap[item.product_id] = {
            reasons: item.reasons,
            recommended_action: item.recommended_action,
          };
        }
      } catch (aiErr: any) {
        console.warn('[Priorities] Gemini reasoning failed, applying deterministic fallback:', aiErr.message);
      }
    }

    // 5. Insert / Save to database with deterministic fallback if AI was unavailable
    const savedPriorities: any[] = [];

    for (const item of productsWithScores) {
      const s = item.scoreResult;
      const aiData = reasonsMap[item.id];

      // Fallback rule-based reasons if Gemini is not configured or failed
      const fallbackReasons: string[] = [];
      if (s.margin_pct !== null) {
        fallbackReasons.push(`Gross margin is ${s.margin_pct}% (Selling for Rs. ${Number(s.data_used.price_lkr).toLocaleString('en-US', { minimumFractionDigits: 2 })}).`);
      }
      if (s.data_used.units_sold_30d > 0) {
        fallbackReasons.push(`Strong demand: ${s.data_used.units_sold_30d} units sold in past 30 days.`);
      } else {
        fallbackReasons.push(`Available inventory: ${s.data_used.stock_qty} units in stock.`);
      }
      if (s.festival_boost.applied) {
        fallbackReasons.push(`High cultural demand boost for upcoming ${s.festival_boost.festival_name}.`);
      }
      if (s.data_used.stock_qty <= 0) {
        fallbackReasons.push('Currently out of stock. Prioritize restock before running ads.');
      }

      const finalReasons = aiData?.reasons?.length ? aiData.reasons : fallbackReasons;
      if (aiData?.recommended_action) {
        finalReasons.push(`Action: ${aiData.recommended_action}`);
      }

      const insertRes = await pool.query(
        `INSERT INTO product_priorities (product_id, priority, score, reasons, data_used, data_missing, festival_boost)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          item.id,
          s.priority,
          s.total_score,
          JSON.stringify(finalReasons),
          JSON.stringify(s.data_used),
          JSON.stringify(s.data_missing),
          s.festival_boost.applied ? JSON.stringify(s.festival_boost) : null,
        ]
      );

      savedPriorities.push({
        ...insertRes.rows[0],
        product_name: item.name,
        category: item.category,
        price_lkr: item.price_lkr,
        cost_lkr: item.cost_lkr,
        stock_qty: item.stock_qty,
        is_demo: item.is_demo,
      });
    }

    savedPriorities.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    res.json({
      success: true,
      message: `Generated priority scores for ${savedPriorities.length} products`,
      priorities: savedPriorities,
      approachingFestivals,
    });
  } catch (err: any) {
    console.error('[Priorities] Generate error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate priorities', details: err.message });
  }
});

export default router;
