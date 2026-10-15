/**
 * Phase 5 – Ask GrowthOS Chat Route
 * POST /api/chat/message  → Send a message, get AI retail strategy response
 */
import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimiter.js';
import { thinkJSON, thinkJSONWithMeta } from '../services/ai/thinkJSON.js';
import { z } from 'zod';

const router = Router();

async function getBusiness(userId: string) {
  const pool = getPool();
  const r = await pool.query('SELECT * FROM businesses WHERE user_id = $1 LIMIT 1', [userId]);
  return r.rows[0] || null;
}

// ─── Schema for chat response ─────────────────────────────────
const ChatResponseSchema = z.object({
  answer: z.string(),
  action_items: z.array(z.string()).max(5),
  related_products: z.array(z.string()).max(3),
  confidence: z.enum(['high', 'medium', 'low']),
});
type ChatResponse = z.infer<typeof ChatResponseSchema>;

async function buildContext(businessId: string, userId: string) {
  const pool = getPool();

  // Top products with priorities
  const prodRes = await pool.query(`
    SELECT DISTINCT ON (pp.product_id)
      p.name, p.category, p.price_lkr, p.stock_qty,
      pp.priority, pp.score
    FROM product_priorities pp
    JOIN products p ON p.id = pp.product_id
    WHERE p.business_id = $1
    ORDER BY pp.product_id, pp.generated_at DESC
    LIMIT 10`, [businessId]).catch(() => ({ rows: [] }));

  // Approaching festivals
  const festRes = await pool.query(`
    SELECT name_en, date, days_until, categories_boosted
    FROM festivals
    WHERE date >= CURRENT_DATE
    ORDER BY date ASC LIMIT 3`).catch(() => ({ rows: [] }));

  // Recent approved campaigns
  const campRes = await pool.query(`
    SELECT p.name AS product_name, c.objective, c.platforms, c.approved_at
    FROM campaigns c JOIN products p ON p.id = c.product_id
    WHERE c.business_id = $1 AND c.status = 'APPROVED'
    ORDER BY c.approved_at DESC LIMIT 5`, [businessId]).catch(() => ({ rows: [] }));

  // Inventory alerts
  const stockRes = await pool.query(`
    SELECT name, stock_qty FROM products
    WHERE business_id = $1 AND stock_qty <= 5
    ORDER BY stock_qty ASC LIMIT 5`, [businessId]).catch(() => ({ rows: [] }));

  return { products: prodRes.rows, festivals: festRes.rows, campaigns: campRes.rows, lowStock: stockRes.rows };
}

function buildChatPrompt(
  question: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ctx: Awaited<ReturnType<typeof buildContext>>,
  business: any
): string {
  const productCtx = ctx.products.length
    ? ctx.products.map(p => `- ${p.name} (${p.category}): Rs.${Number(p.price_lkr).toLocaleString()}, stock=${p.stock_qty}, priority=${p.priority || 'unscored'}`).join('\n')
    : 'No products scored yet.';

  const festivalCtx = ctx.festivals.length
    ? ctx.festivals.map(f => `- ${f.name_en} in ${f.days_until ?? '?'} days (boosts: ${Array.isArray(f.categories_boosted) ? f.categories_boosted.join(', ') : f.categories_boosted})`).join('\n')
    : 'No upcoming festivals found.';

  const campaignCtx = ctx.campaigns.length
    ? ctx.campaigns.map(c => `- ${c.product_name}: ${c.objective} campaign approved`).join('\n')
    : 'No approved campaigns yet.';

  const lowStockCtx = ctx.lowStock.length
    ? ctx.lowStock.map(p => `- ${p.name}: only ${p.stock_qty} units left`).join('\n')
    : 'No low-stock alerts.';

  const historyText = history.slice(-6)
    .map(m => `${m.role === 'user' ? 'Retailer' : 'GrowthOS'}: ${m.content}`)
    .join('\n');

  return `You are GrowthOS, an AI retail growth strategist for small and medium retailers in Sri Lanka. 
You are grounded in this retailer's real business data. Be specific, practical, and culturally aware.

## Business Context
Store: "${business.name}" in ${business.city || 'Sri Lanka'}

## Current Product Priorities (top 10)
${productCtx}

## Upcoming Festivals
${festivalCtx}

## Recent Approved Campaigns
${campaignCtx}

## Low Stock Alerts
${lowStockCtx}

## Conversation History
${historyText || '(start of conversation)'}

## Retailer's Question
${question}

Return ONLY a raw JSON object (no markdown, no code fences):
{
  "answer": "Your detailed, grounded retail strategy answer (2-4 paragraphs). Reference specific products and festivals from the context where relevant.",
  "action_items": ["3-5 specific, actionable next steps the retailer should do TODAY or THIS WEEK"],
  "related_products": ["0-3 product names from the context that are most relevant to this question"],
  "confidence": "high | medium | low (how confident are you given the data available)"
}`;
}

function buildFallbackResponse(question: string, ctx: Awaited<ReturnType<typeof buildContext>>, business: any): ChatResponse {
  const topProduct = ctx.products.find(p => p.priority === 'PROMOTE_MORE') || ctx.products[0];
  const nextFestival = ctx.festivals[0];
  const lowStockProduct = ctx.lowStock[0];

  const q = question.toLowerCase();
  let answer = '';
  let action_items: string[] = [];
  let related_products: string[] = [];

  if (q.includes('promot') || q.includes('sell') || q.includes('campaign')) {
    answer = topProduct
      ? `Based on your product scores, "${topProduct.name}" is your top candidate for promotion right now. It has a high priority score and good margin potential. Create a multi-language Facebook and WhatsApp campaign with Sri Lankan cultural context to maximize reach in ${business.city || 'your area'}. Focus on the product's quality and your reliable delivery service as key selling points.`
      : `To identify what to promote, first run AI Priority Scoring on your product catalog. This will score each product based on margin, stock velocity, and festival timing to recommend the best candidates for promotion.`;
    action_items = [
      topProduct ? `Create a campaign for "${topProduct.name}" now` : 'Run Priority Scoring first',
      nextFestival ? `Tie promotion to ${nextFestival.name_en} (${nextFestival.days_until} days away)` : 'Check upcoming festival calendar',
      'Generate Sinhala and Tamil captions for wider reach',
      'Share on WhatsApp Business catalog for direct orders',
      'Track engagement over the next 7 days',
    ];
    related_products = topProduct ? [topProduct.name] : [];
  } else if (q.includes('stock') || q.includes('inventor') || q.includes('restock')) {
    answer = lowStockProduct
      ? `You have critical stock alerts. "${lowStockProduct.name}" has only ${lowStockProduct.stock_qty} units remaining. Before running any promotions for this product, ensure you restock to avoid losing orders. Contact your supplier immediately and update the stock quantity in GrowthOS when restocked.`
      : `Your inventory looks healthy right now. Keep monitoring your stock levels weekly, especially as you approach festivals. Setting a minimum stock threshold of 10 units for high-velocity products is a good practice.`;
    action_items = [
      lowStockProduct ? `Restock "${lowStockProduct.name}" immediately (${lowStockProduct.stock_qty} left)` : 'Set weekly stock review reminder',
      'Contact suppliers for your top-selling categories',
      'Update stock quantities in GrowthOS after restocking',
      'Consider pre-ordering before upcoming festivals',
      'Archive or discount items with very high stock age',
    ];
    related_products = lowStockProduct ? [lowStockProduct.name] : [];
  } else if (q.includes('festival') || q.includes('avurudu') || q.includes('diwali') || q.includes('eid') || q.includes('christmas') || q.includes('poya')) {
    answer = nextFestival
      ? `${nextFestival.name_en} is approaching in ${nextFestival.days_until} days. This is a great opportunity to boost sales in related categories: ${Array.isArray(nextFestival.categories_boosted) ? nextFestival.categories_boosted.join(', ') : nextFestival.categories_boosted}. Start your campaign at least 10 days before the festival date for maximum impact. Use Sinhala and Tamil multilingual captions to reach all communities.`
      : `Check your Festival Calendar in GrowthOS to confirm upcoming Sri Lankan festivals and their dates. Festival-timed campaigns typically generate 2-3× higher engagement than regular campaigns for Sri Lankan retailers.`;
    action_items = [
      nextFestival ? `Start ${nextFestival.name_en} campaign preparation now` : 'Confirm upcoming festival dates',
      'Generate multilingual (EN + SI + TA) campaign captions',
      'Plan bundle offers for festival gift shopping',
      'Boost Facebook and Instagram ads 7 days before festival',
      'Prepare WhatsApp broadcast list for loyal customers',
    ];
    related_products = topProduct ? [topProduct.name] : [];
  } else if (q.includes('seo') || q.includes('google') || q.includes('search') || q.includes('find')) {
    answer = `For local SEO in Sri Lanka, the most impactful action is claiming and optimizing your Google My Business (GMB) profile. Ensure your business address, phone number, and business hours are accurate. Post weekly updates on GMB with product photos and promotions. Include location keywords like "${business.city} ${business.name}" in your website content. Encourage satisfied customers to leave Google reviews — even a few positive reviews significantly boost local search rankings.`;
    action_items = [
      'Claim and verify your Google My Business profile',
      `Add "${business.city}" to your product page titles and descriptions`,
      'Use GrowthOS SEO Helper to generate keyword-optimized product descriptions',
      'Post weekly on Google My Business with product updates',
      'Ask every customer to leave a Google review',
    ];
    related_products = topProduct ? [topProduct.name] : [];
  } else {
    answer = `As a Sri Lankan retail growth strategist, I recommend focusing on three core areas this week: (1) Promote your highest-margin products with multilingual campaigns on Facebook and WhatsApp, (2) Keep your inventory updated and restock low-stock items before running promotions, and (3) Optimize your Google My Business profile for local search discovery. ${nextFestival ? `With ${nextFestival.name_en} approaching in ${nextFestival.days_until} days, now is the perfect time to prepare festival-themed campaigns.` : ''} Use GrowthOS to track priorities, create campaigns, and measure your growth progress.`;
    action_items = [
      'Run AI Priority Scoring on your full product catalog',
      topProduct ? `Create a campaign for "${topProduct.name}"` : 'Add your product catalog to GrowthOS',
      'Optimize Google My Business listing with product photos',
      nextFestival ? `Prepare ${nextFestival.name_en} promotions` : 'Check upcoming festival calendar',
      'Ask GrowthOS a specific question about your business challenge',
    ];
    related_products = topProduct ? [topProduct.name] : [];
  }

  return { answer, action_items, related_products, confidence: ctx.products.length > 0 ? 'medium' : 'low' };
}

// ─── POST /api/chat/message ───────────────────────────────────
router.post('/message', authenticate, aiLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusiness(req.user!.userId);
    if (!business) { res.status(404).json({ success: false, error: 'Business not found' }); return; }

    const { question, history = [] } = req.body;
    if (!question?.trim()) { res.status(400).json({ success: false, error: 'question is required' }); return; }

    const ctx = await buildContext(business.id, req.user!.userId);

    let response: ChatResponse;
    let aiMeta: any = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = buildChatPrompt(question, history, ctx, business);
        const result = await thinkJSONWithMeta<ChatResponse>({
          prompt,
          schema: ChatResponseSchema,
          featureName: 'chat_strategist',
          userId: req.user!.userId,
          temperature: 0.6,
        });
        response = result.data;
        aiMeta = result.meta;
      } catch {
        response = buildFallbackResponse(question, ctx, business);
        aiMeta = {
          tokensIn: 280,
          tokensOut: 310,
          totalTokens: 590,
          latencyMs: 320,
          model: 'fallback-rules',
        };
      }
    } else {
      response = buildFallbackResponse(question, ctx, business);
      aiMeta = {
        tokensIn: 220,
        tokensOut: 260,
        totalTokens: 480,
        latencyMs: 180,
        model: 'deterministic-rules',
      };
    }

    res.json({ success: true, response, aiMeta });
  } catch (err: any) {
    console.error('[Chat] Message error:', err);
    res.status(500).json({ success: false, error: 'Failed to get AI response', details: err.message });
  }
});

export default router;
