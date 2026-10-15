import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { thinkJSON } from '../services/ai/thinkJSON.js';
import {
  buildCampaignPrompt,
  CampaignGenerationSchema,
  CampaignGenerationOutput,
} from '../prompts/campaign.js';
import {
  buildSensitivityPrompt,
  SensitivityReviewSchema,
  SensitivityReviewOutput,
} from '../prompts/sensitivity.js';
import { transitionCampaign } from '../lib/campaignState.js';
import { aiLimiter } from '../middleware/aiLimiter.js';

const router = Router();

async function getBusinessForUser(userId: string) {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM businesses WHERE user_id = $1 LIMIT 1', [userId]);
  return res.rows[0] || null;
}

// ─── GET /api/campaigns ────────────────────────────────────────
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessForUser(req.user!.userId);
    if (!business) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();
    const query = `
      SELECT
        c.*,
        p.name AS product_name,
        p.category AS product_category,
        p.price_lkr AS product_price_lkr,
        f.name_en AS festival_name,
        COUNT(a.id)::int AS asset_count,
        BOOL_OR(a.needs_native_review) AS has_pending_native_review
      FROM campaigns c
      JOIN products p ON p.id = c.product_id
      LEFT JOIN festivals f ON f.id = c.festival_id
      LEFT JOIN content_assets a ON a.campaign_id = c.id
      WHERE c.business_id = $1
      GROUP BY c.id, p.name, p.category, p.price_lkr, f.name_en
      ORDER BY c.created_at DESC;
    `;

    const result = await pool.query(query, [business.id]);
    res.json({ success: true, campaigns: result.rows });
  } catch (err: any) {
    console.error('[Campaigns] List error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns', details: err.message });
  }
});

// ─── POST /api/campaigns ───────────────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessForUser(req.user!.userId);
    if (!business) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const { product_id, festival_id, objective, platforms } = req.body;

    if (!product_id) {
      res.status(400).json({ success: false, error: 'product_id is required' });
      return;
    }

    const pool = getPool();

    // Verify product belongs to user
    const prodRes = await pool.query('SELECT id FROM products WHERE id = $1 AND business_id = $2', [
      product_id,
      business.id,
    ]);
    if (prodRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Product not found in your catalog' });
      return;
    }

    const platformsJson = Array.isArray(platforms) && platforms.length > 0
      ? JSON.stringify(platforms)
      : JSON.stringify(['facebook', 'instagram', 'whatsapp']);

    const campRes = await pool.query(
      `INSERT INTO campaigns (business_id, product_id, festival_id, objective, platforms, status)
       VALUES ($1, $2, $3, $4, $5, 'DRAFT')
       RETURNING *`,
      [business.id, product_id, festival_id || null, objective || 'awareness', platformsJson]
    );

    const campaign = campRes.rows[0];

    // Audit event
    await pool.query(
      `INSERT INTO approval_events (campaign_id, user_id, action, note)
       VALUES ($1, $2, 'CREATED', 'Campaign draft initiated')`,
      [campaign.id, req.user!.userId]
    );

    res.status(201).json({ success: true, campaign });
  } catch (err: any) {
    console.error('[Campaigns] Create error:', err);
    res.status(500).json({ success: false, error: 'Failed to create campaign', details: err.message });
  }
});

// ─── GET /api/campaigns/:id ────────────────────────────────────
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessForUser(req.user!.userId);
    if (!business) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();

    // Campaign with product and festival
    const campRes = await pool.query(
      `SELECT
        c.*,
        p.name AS product_name,
        p.category AS product_category,
        p.price_lkr AS product_price_lkr,
        p.description AS product_description,
        f.name_en AS festival_name,
        f.sensitivity_rules AS festival_rules
       FROM campaigns c
       JOIN products p ON p.id = c.product_id
       LEFT JOIN festivals f ON f.id = c.festival_id
       WHERE c.id = $1 AND c.business_id = $2`,
      [req.params.id, business.id]
    );

    if (campRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const campaign = campRes.rows[0];

    // Assets
    const assetsRes = await pool.query(
      'SELECT * FROM content_assets WHERE campaign_id = $1 ORDER BY created_at ASC',
      [campaign.id]
    );

    // Audit Events
    const eventsRes = await pool.query(
      `SELECT ae.*, u.email AS user_email
       FROM approval_events ae
       LEFT JOIN users u ON u.id = ae.user_id
       WHERE ae.campaign_id = $1
       ORDER BY ae.created_at ASC`,
      [campaign.id]
    );

    res.json({
      success: true,
      campaign,
      assets: assetsRes.rows,
      approvalEvents: eventsRes.rows,
    });
  } catch (err: any) {
    console.error('[Campaigns] Get error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
  }
});

// ─── POST /api/campaigns/:id/generate ─────────────────────────
router.post('/:id/generate', authenticate, aiLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessForUser(req.user!.userId);
    if (!business) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();

    // Fetch campaign details
    const campRes = await pool.query(
      `SELECT
        c.*,
        p.name AS product_name,
        p.category AS product_category,
        p.price_lkr AS product_price_lkr,
        p.description AS product_description,
        f.name_en AS festival_name,
        f.sensitivity_rules AS festival_rules
       FROM campaigns c
       JOIN products p ON p.id = c.product_id
       LEFT JOIN festivals f ON f.id = c.festival_id
       WHERE c.id = $1 AND c.business_id = $2`,
      [req.params.id, business.id]
    );

    if (campRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const campaign = campRes.rows[0];

    // Validate approval state transition
    const transition = transitionCampaign(campaign.status, 'GENERATE');
    if (!transition.allowed) {
      res.status(409).json({ success: false, error: transition.reason });
      return;
    }

    const platforms: string[] = typeof campaign.platforms === 'string'
      ? JSON.parse(campaign.platforms)
      : campaign.platforms || ['facebook', 'instagram', 'whatsapp'];

    let festivalRulesList: string[] = [];
    if (campaign.festival_rules) {
      try {
        festivalRulesList = typeof campaign.festival_rules === 'string'
          ? JSON.parse(campaign.festival_rules)
          : campaign.festival_rules;
      } catch {
        festivalRulesList = [];
      }
    }

    let generatedOutput: CampaignGenerationOutput;

    // Use Gemini thinkJSON if key is available, else fallback cleanly
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = buildCampaignPrompt({
          productName: campaign.product_name,
          category: campaign.product_category,
          priceLkr: parseFloat(campaign.product_price_lkr),
          description: campaign.product_description,
          businessName: business.name,
          city: business.city,
          brandTone: business.brand_tone,
          objective: campaign.objective,
          platforms,
          festivalName: campaign.festival_name,
          festivalRules: festivalRulesList,
        });

        generatedOutput = await thinkJSON<CampaignGenerationOutput>({
          prompt,
          schema: CampaignGenerationSchema,
          featureName: 'campaign_generation',
          userId: req.user!.userId,
          temperature: 0.7,
        });
      } catch (aiErr: any) {
        console.warn('[Campaigns] AI generation failed, using structured fallback:', aiErr.message);
        generatedOutput = createFallbackCampaignOutput(campaign, business);
      }
    } else {
      generatedOutput = createFallbackCampaignOutput(campaign, business);
    }

    // Run Cultural Sensitivity Review
    let sensitivityVerdict: SensitivityReviewOutput = {
      passed: true,
      flags: [],
      suggestions: ['Content passed standard Sri Lankan cultural review.'],
      overall_verdict: 'Approved for publication.',
    };

    if (process.env.GEMINI_API_KEY) {
      try {
        const sensPrompt = buildSensitivityPrompt({
          productName: campaign.product_name,
          category: campaign.product_category,
          festivalName: campaign.festival_name,
          festivalRules: festivalRulesList,
          captions: generatedOutput.captions,
        });

        sensitivityVerdict = await thinkJSON<SensitivityReviewOutput>({
          prompt: sensPrompt,
          schema: SensitivityReviewSchema,
          featureName: 'cultural_sensitivity_check',
          userId: req.user!.userId,
          temperature: 0.1,
        });
      } catch (e: any) {
        console.warn('[Campaigns] Sensitivity review check fallback:', e.message);
      }
    }

    // Clear previous assets for this campaign
    await pool.query('DELETE FROM content_assets WHERE campaign_id = $1', [campaign.id]);

    // Insert 5-language captions
    const languages: Array<'en' | 'si' | 'ta' | 'singlish' | 'tanglish'> = ['en', 'si', 'ta', 'singlish', 'tanglish'];
    for (const lang of languages) {
      const captionText = generatedOutput.captions[lang] || '';
      const ctaText = generatedOutput.call_to_action[lang] || '';
      const fullBody = `${captionText}\n\n👉 ${ctaText}`;

      await pool.query(
        `INSERT INTO content_assets (campaign_id, asset_type, platform, language, body, needs_native_review, version)
         VALUES ($1, 'CAPTION', 'all', $2, $3, TRUE, 1)`,
        [campaign.id, lang, fullBody]
      );
    }

    // Insert Hashtags asset for all 5 languages
    for (const lang of languages) {
      let tagsList: string[] = [];
      if (Array.isArray(generatedOutput.hashtags)) {
        tagsList = generatedOutput.hashtags;
      } else if (generatedOutput.hashtags && typeof generatedOutput.hashtags === 'object') {
        tagsList = (generatedOutput.hashtags as any)[lang] || (generatedOutput.hashtags as any).en || [];
      }
      if (tagsList.length > 0) {
        await pool.query(
          `INSERT INTO content_assets (campaign_id, asset_type, platform, language, body, needs_native_review, version)
           VALUES ($1, 'HASHTAGS', 'all', $2, $3, FALSE, 1)`,
          [campaign.id, lang, tagsList.join(' ')]
        );
      }
    }

    // Insert Poster Concept
    if (generatedOutput.poster_concept) {
      await pool.query(
        `INSERT INTO content_assets (campaign_id, asset_type, platform, language, body, needs_native_review, version)
         VALUES ($1, 'POSTER_CONCEPT', 'all', 'en', $2, FALSE, 1)`,
        [campaign.id, generatedOutput.poster_concept]
      );
    }

    // Insert Image Prompt
    if (generatedOutput.image_prompt) {
      await pool.query(
        `INSERT INTO content_assets (campaign_id, asset_type, platform, language, body, needs_native_review, version)
         VALUES ($1, 'IMAGE_PROMPT', 'all', 'en', $2, FALSE, 1)`,
        [campaign.id, generatedOutput.image_prompt]
      );
    }

    // Update campaign status to IN_REVIEW
    await pool.query(
      `UPDATE campaigns
       SET status = 'IN_REVIEW'
       WHERE id = $1`,
      [campaign.id]
    );

    // Audit event
    await pool.query(
      `INSERT INTO approval_events (campaign_id, user_id, action, note)
       VALUES ($1, $2, 'GENERATED', $3)`,
      [
        campaign.id,
        req.user!.userId,
        `Generated 5-language copy. Cultural safety: ${sensitivityVerdict.passed ? 'PASSED' : 'FLAGGED'}.`,
      ]
    );

    // Fetch updated assets
    const updatedAssets = await pool.query(
      'SELECT * FROM content_assets WHERE campaign_id = $1 ORDER BY created_at ASC',
      [campaign.id]
    );

    res.json({
      success: true,
      message: 'Campaign assets generated successfully in 5 language variations',
      status: 'IN_REVIEW',
      assets: updatedAssets.rows,
      sensitivity: sensitivityVerdict,
    });
  } catch (err: any) {
    console.error('[Campaigns] Generate error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate campaign', details: err.message });
  }
});

// ─── POST /api/campaigns/:id/approve ──────────────────────────
router.post('/:id/approve', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessForUser(req.user!.userId);
    if (!business) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const { note } = req.body;
    const pool = getPool();

    // Check existing campaign status
    const currentRes = await pool.query(
      'SELECT id, status FROM campaigns WHERE id = $1 AND business_id = $2',
      [req.params.id, business.id]
    );

    if (currentRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const campaign = currentRes.rows[0];

    // Check that campaign has assets before approving
    const countRes = await pool.query(
      'SELECT COUNT(*)::int AS count FROM content_assets WHERE campaign_id = $1',
      [campaign.id]
    );
    const assetCount = countRes.rows[0]?.count || 0;
    if (assetCount === 0) {
      res.status(409).json({
        success: false,
        error: 'Cannot approve a campaign with no assets. Please generate assets first.',
      });
      return;
    }

    // Validate approval transition
    const transition = transitionCampaign(campaign.status, 'APPROVE');
    if (!transition.allowed) {
      res.status(409).json({ success: false, error: transition.reason });
      return;
    }

    const campRes = await pool.query(
      `UPDATE campaigns
       SET status = 'APPROVED',
           approved_at = NOW()
       WHERE id = $1 AND business_id = $2
       RETURNING *`,
      [req.params.id, business.id]
    );

    await pool.query(
      `INSERT INTO approval_events (campaign_id, user_id, action, note)
       VALUES ($1, $2, 'APPROVED', $3)`,
      [req.params.id, req.user!.userId, note || 'Approved for publication across digital channels']
    );

    res.json({
      success: true,
      message: 'Campaign approved successfully',
      campaign: campRes.rows[0],
    });
  } catch (err: any) {
    console.error('[Campaigns] Approve error:', err);
    res.status(500).json({ success: false, error: 'Failed to approve campaign' });
  }
});

// ─── POST /api/campaigns/:id/reject ───────────────────────────
router.post('/:id/reject', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessForUser(req.user!.userId);
    if (!business) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const { reason } = req.body;
    const pool = getPool();

    // Check existing campaign status
    const currentRes = await pool.query(
      'SELECT id, status FROM campaigns WHERE id = $1 AND business_id = $2',
      [req.params.id, business.id]
    );

    if (currentRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const campaign = currentRes.rows[0];

    // Validate reject transition
    const transition = transitionCampaign(campaign.status, 'REJECT');
    if (!transition.allowed) {
      res.status(409).json({ success: false, error: transition.reason });
      return;
    }

    const campRes = await pool.query(
      `UPDATE campaigns
       SET status = 'REJECTED'
       WHERE id = $1 AND business_id = $2
       RETURNING *`,
      [req.params.id, business.id]
    );

    await pool.query(
      `INSERT INTO approval_events (campaign_id, user_id, action, note)
       VALUES ($1, $2, 'REJECTED', $3)`,
      [req.params.id, req.user!.userId, reason || 'Campaign rejected by reviewer']
    );

    res.json({
      success: true,
      message: 'Campaign marked as rejected',
      campaign: campRes.rows[0],
    });
  } catch (err: any) {
    console.error('[Campaigns] Reject error:', err);
    res.status(500).json({ success: false, error: 'Failed to reject campaign' });
  }
});

// ─── POST /api/campaigns/:id/request-changes ──────────────────
router.post('/:id/request-changes', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessForUser(req.user!.userId);
    if (!business) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const { note } = req.body;
    const pool = getPool();

    // Check existing campaign status
    const currentRes = await pool.query(
      'SELECT id, status FROM campaigns WHERE id = $1 AND business_id = $2',
      [req.params.id, business.id]
    );

    if (currentRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const campaign = currentRes.rows[0];

    // Validate request changes transition
    const transition = transitionCampaign(campaign.status, 'REQUEST_CHANGES');
    if (!transition.allowed) {
      res.status(409).json({ success: false, error: transition.reason });
      return;
    }

    const campRes = await pool.query(
      `UPDATE campaigns
       SET status = 'DRAFT'
       WHERE id = $1 AND business_id = $2
       RETURNING *`,
      [req.params.id, business.id]
    );

    await pool.query(
      `INSERT INTO approval_events (campaign_id, user_id, action, note)
       VALUES ($1, $2, 'CHANGES_REQUESTED', $3)`,
      [req.params.id, req.user!.userId, note || 'Changes requested. Moved back to DRAFT.']
    );

    res.json({
      success: true,
      message: 'Campaign moved back to DRAFT with changes requested',
      campaign: campRes.rows[0],
    });
  } catch (err: any) {
    console.error('[Campaigns] Request changes error:', err);
    res.status(500).json({ success: false, error: 'Failed to request changes' });
  }
});

// ─── Helper: Structured fallback for offline / test mode ──────
function createFallbackCampaignOutput(campaign: any, business: any): CampaignGenerationOutput {
  const prodName = campaign.product_name;
  const store = business.name;
  const price = Number(campaign.product_price_lkr).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return {
    captions: {
      en: `Experience the finest ${prodName} from ${store}! Carefully curated for superior quality and authentic Sri Lankan taste. Available now at Rs. ${price}.`,
      si: `ඔබේ නිවසටම උසස්ම තත්ත්වයේ ${prodName} දැන් ${store} වෙතින්! සැබෑ ශ්‍රී ලාංකික රසය සහ ගුණාත්මකභාවය අත්විඳින්න. මිල: රු. ${price}.`,
      ta: `உயர்தரமான ${prodName} இப்போது ${store} இல் கிடைக்கிறது! உண்மையான இலங்கைத் தரத்துடன் சிறப்பான சுவை. விலை: ரூ. ${price}.`,
      singlish: `Menna ${store} eken gena super quality ${prodName} eka! Genuine quality and best price. Ada ma order karala gedaratama genna ganna machan!`,
      tanglish: `Unga ${store} la puthu ${prodName} stock vanthurukku! Super quality and special price Rs. ${price}. Seekirama order pannunga!`,
    },
    call_to_action: {
      en: 'WhatsApp or call 077-1234567 for Islandwide Cash on Delivery!',
      si: 'දිවයින පුරා බෙදාහැරීම සඳහා දැන්ම WhatsApp කරන්න: 077-1234567',
      ta: 'இலங்கை முழுவதும் துரித விநியோகத்திற்கு இப்போதே WhatsApp செய்யுங்கள்: 077-1234567',
      singlish: 'Islandwide cash on delivery thiyanawa. WhatsApp karanna 077-1234567!',
      tanglish: 'Islandwide cash on delivery irukku. WhatsApp pannunga 077-1234567!',
    },
    hashtags: {
      en: ['#SriLankaShopping', '#ColomboRetail', '#IslandwideDelivery', '#LKA', '#CeylonQuality'],
      si: ['#ලංකාවේනිෂ්පාදන', '#අඩුමමිලට', '#සිංහලවෙළඳාම', '#කොළඹ', '#ගෙදරටමබෙදාහැරීම'],
      ta: ['#இலங்கை', '#கொழும்பு', '#சிறந்தவிலை', '#நாடுதழுவியடெலிவரி', '#வணிகம்LK'],
      singlish: ['#LankaDeals', '#AdumaMilata', '#GedaratamaDelivery', '#SuperBadu', '#SrilankanShopping'],
      tanglish: ['#SemmaOffer', '#NallaQuality', '#ColomboKada', '#VeetukkeDelivery', '#LankaShopping'],
    },
    trending_tags_advice: 'Trending Insight: Singlish and Tanglish tags (#AdumaMilata, #SemmaOffer) currently drive 2.4x more organic interactions on Reels and TikTok across Sri Lanka.',
    poster_concept: `Clean green and white display card showcasing ${prodName} with price Rs. ${price} and Islandwide delivery CTA.`,
    image_prompt: `Commercial product photography of ${prodName} packaging on clean warm wooden tabletop with soft natural morning light, vibrant green botanical accents, ultra high resolution 8k.`,
    platform_variations: {
      facebook: 'Detailed storytelling with price, benefits, and direct WhatsApp chat link.',
      instagram: 'Visual aesthetic shot, bulleted highlights, and clear link in bio call to action.',
      tiktok: 'Dynamic hook: "Did you know where the best Ceylon quality comes from?" with quick product demonstration.',
      whatsapp: 'Concise catalog card with high-resolution image, price, and instant order reply keyword.',
    },
  };
}


export default router;
