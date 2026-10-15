import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/aiLimiter.js';
import { thinkJSON } from '../services/ai/thinkJSON.js';
import { z } from 'zod';

const router = Router();

async function verifyAssetOwnership(assetId: string, userId: string) {
  const pool = getPool();
  const query = `
    SELECT a.*, c.business_id, p.name AS product_name, p.category AS product_category, p.price_lkr, b.name AS business_name
    FROM content_assets a
    JOIN campaigns c ON c.id = a.campaign_id
    JOIN businesses b ON b.id = c.business_id
    JOIN products p ON p.id = c.product_id
    WHERE a.id = $1 AND b.user_id = $2
  `;
  const res = await pool.query(query, [assetId, userId]);
  return res.rows[0] || null;
}

// ─── POST /api/assets/:id/reviewed ────────────────────────────
router.post('/:id/reviewed', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assetId = String(req.params.id);
    const asset = await verifyAssetOwnership(assetId, req.user!.userId);
    if (!asset) {
      res.status(404).json({ success: false, error: 'Asset not found or access denied' });
      return;
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE content_assets
       SET needs_native_review = FALSE
       WHERE id = $1
       RETURNING *`,
      [assetId]
    );

    res.json({
      success: true,
      message: 'Asset marked as verified by native speaker',
      asset: result.rows[0],
    });
  } catch (err: any) {
    console.error('[Assets] Reviewed error:', err);
    res.status(500).json({ success: false, error: 'Failed to update asset review status' });
  }
});

// ─── PUT /api/assets/:id ──────────────────────────────────────
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assetId = String(req.params.id);
    const asset = await verifyAssetOwnership(assetId, req.user!.userId);
    if (!asset) {
      res.status(404).json({ success: false, error: 'Asset not found or access denied' });
      return;
    }

    const { body } = req.body;
    if (!body || typeof body !== 'string') {
      res.status(400).json({ success: false, error: 'Asset body is required' });
      return;
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE content_assets
       SET body = $1,
           needs_native_review = FALSE,
           version = version + 1
       WHERE id = $2
       RETURNING *`,
      [body.trim(), assetId]
    );

    res.json({
      success: true,
      message: 'Asset updated successfully',
      asset: result.rows[0],
    });
  } catch (err: any) {
    console.error('[Assets] Update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update asset' });
  }
});

// ─── POST /api/assets/:id/regenerate ──────────────────────────
const RegenerateAssetSchema = z.object({
  body: z.string().min(10),
});

router.post('/:id/regenerate', authenticate, aiLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assetId = String(req.params.id);
    const asset = await verifyAssetOwnership(assetId, req.user!.userId);
    if (!asset) {
      res.status(404).json({ success: false, error: 'Asset not found or access denied' });
      return;
    }

    let newBody = asset.body;

    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `
You are the Creative Director for "${asset.business_name}" in Sri Lanka.
Regenerate a fresh creative variation for this marketing asset:
- Product: ${asset.product_name} (Category: ${asset.product_category}, Price: Rs. ${asset.price_lkr})
- Asset Type: ${asset.asset_type}
- Target Language: ${asset.language}
- Previous Version: "${asset.body}"

Instructions:
- Provide an engaging, fresh alternate angle.
- Maintain accurate localized vocabulary (${asset.language === 'si' ? 'Sinhala Unicode script' : asset.language === 'ta' ? 'Tamil Unicode script' : asset.language === 'singlish' ? 'Colloquial Singlish' : asset.language === 'tanglish' ? 'Colloquial Tanglish' : 'Sri Lankan English'}).
- Include clear WhatsApp delivery Call to Action.

Return strictly JSON with key "body".
`;

        const output = await thinkJSON<{ body: string }>({
          prompt,
          schema: RegenerateAssetSchema,
          featureName: 'asset_regeneration',
          userId: req.user!.userId,
          temperature: 0.8,
        });

        newBody = output.body;
      } catch (aiErr: any) {
        console.warn('[Assets] AI regeneration failed, appending variation:', aiErr.message);
        newBody = `${asset.body}\n\n✨ Special Islandwide Cash on Delivery available! Order now on WhatsApp.`;
      }
    } else {
      newBody = `${asset.body}\n\n✨ Limited stock offer! Islandwide Cash on Delivery. Order now on WhatsApp.`;
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE content_assets
       SET body = $1,
           needs_native_review = TRUE,
           version = version + 1
       WHERE id = $2
       RETURNING *`,
      [newBody, assetId]
    );

    res.json({
      success: true,
      message: 'Asset regenerated successfully',
      asset: result.rows[0],
    });
  } catch (err: any) {
    console.error('[Assets] Regenerate error:', err);
    res.status(500).json({ success: false, error: 'Failed to regenerate asset', details: err.message });
  }
});


export default router;
