import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/festivals ────────────────────────────────────────
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM festivals ORDER BY year ASC, date ASC');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const festivalsWithCountdown = result.rows.map((f) => {
      let daysUntil: number | null = null;
      let isApproaching = false;

      if (f.date) {
        const fDate = new Date(f.date);
        fDate.setHours(0, 0, 0, 0);
        const diffMs = fDate.getTime() - today.getTime();
        daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isApproaching = daysUntil >= -2 && daysUntil <= (f.lead_days || 14);
      }

      return {
        ...f,
        days_until: daysUntil,
        is_approaching: isApproaching,
      };
    });

    res.json({
      success: true,
      festivals: festivalsWithCountdown,
    });
  } catch (err: any) {
    console.error('[Festivals] List error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch festivals', details: err.message });
  }
});

// ─── PUT /api/festivals/:id ────────────────────────────────────
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, date_confirmed, lead_days, categories_boosted, sensitivity_rules, source_note } = req.body;

    const pool = getPool();
    const result = await pool.query(
      `UPDATE festivals
       SET date = COALESCE($1, date),
           date_confirmed = COALESCE($2, date_confirmed),
           lead_days = COALESCE($3, lead_days),
           categories_boosted = COALESCE($4, categories_boosted),
           sensitivity_rules = COALESCE($5, sensitivity_rules),
           source_note = COALESCE($6, source_note)
       WHERE id = $7
       RETURNING *`,
      [
        date || null,
        date_confirmed !== undefined ? !!date_confirmed : null,
        lead_days ? parseInt(lead_days, 10) : null,
        categories_boosted ? JSON.stringify(categories_boosted) : null,
        sensitivity_rules ? JSON.stringify(sensitivity_rules) : null,
        source_note !== undefined ? source_note : null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Festival not found' });
      return;
    }

    res.json({ success: true, festival: result.rows[0] });
  } catch (err: any) {
    console.error('[Festivals] Update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update festival', details: err.message });
  }
});

// ─── POST /api/festivals/:id/confirm ──────────────────────────
router.post('/:id/confirm', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.body;
    const pool = getPool();

    const result = await pool.query(
      `UPDATE festivals
       SET date_confirmed = TRUE,
           date = COALESCE($1, date)
       WHERE id = $2
       RETURNING *`,
      [date || null, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Festival not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Festival date confirmed by retailer',
      festival: result.rows[0],
    });
  } catch (err: any) {
    console.error('[Festivals] Confirm error:', err);
    res.status(500).json({ success: false, error: 'Failed to confirm festival date', details: err.message });
  }
});

export default router;
