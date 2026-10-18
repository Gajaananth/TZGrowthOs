import { z } from 'zod';
import { ScoringResult } from '../lib/scoring.js';

export const PriorityReasoningItemSchema = z.object({
  product_id: z.string(),
  reasons: z.array(z.string()).min(1).transform(r => r.slice(0, 3)),
  recommended_action: z.string().optional().default('Highlight in upcoming promotional campaign'),
});

export const PriorityReasoningResponseSchema = z.preprocess((val: any) => {
  if (Array.isArray(val)) return { items: val };
  if (val && typeof val === 'object' && Array.isArray(val.items)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.products)) return { items: val.products };
  return val;
}, z.object({
  items: z.array(PriorityReasoningItemSchema),
}));

export type PriorityReasoningResponse = z.infer<typeof PriorityReasoningResponseSchema>;

/**
 * Builds the prompt for Gemini to provide retail reasoning for deterministic scores
 */
export function buildPriorityReasoningPrompt(params: {
  businessName: string;
  city: string;
  productsWithScores: Array<{
    id: string;
    name: string;
    category: string;
    scoreResult: ScoringResult;
  }>;
}): string {
  const { businessName, city, productsWithScores } = params;

  const productDataFormatted = productsWithScores.map((p) => {
    const s = p.scoreResult;
    return {
      product_id: p.id,
      name: p.name,
      category: p.category,
      priority: s.priority,
      score: s.total_score,
      price_lkr: s.data_used.price_lkr,
      margin_pct: s.data_used.margin_pct,
      stock_qty: s.data_used.stock_qty,
      units_sold_30d: s.data_used.units_sold_30d,
      festival_boost: s.festival_boost.applied ? s.festival_boost.festival_name : 'None',
    };
  });

  return `
You are the AI Retail Growth Strategist for "${businessName}" located in ${city || 'Sri Lanka'}.
You are analyzing deterministic product priority scores calculated by GrowthOS.

CRITICAL INSTRUCTIONS:
- You must NOT change the assigned priority or score. They are fixed mathematical calculations.
- For each product, write 2 to 3 concise, highly practical, commercial reasons grounded in the exact numbers (e.g. margin, stock velocity, upcoming festival demand in Sri Lanka).
- Provide 1 actionable recommended_action for the retailer (e.g., "Create bundle with treacle for Avurudu", "Launch 20% flash clearance on TikTok to recover tied capital", "Highlight premium quality in WhatsApp broadcast").

Products and Deterministic Scores:
${JSON.stringify(productDataFormatted, null, 2)}

Return your analysis strictly matching this JSON schema:
{
  "items": [
    {
      "product_id": "product uuid string",
      "reasons": ["commercial reason 1 grounded in margin or stock", "commercial reason 2 grounded in local seasonal context"],
      "recommended_action": "concrete marketing or operational next step"
    }
  ]
}
`;
}
