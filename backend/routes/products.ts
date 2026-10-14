import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper to get business_id for the authenticated user
async function getBusinessIdForUser(userId: string): Promise<string | null> {
  const pool = getPool();
  const res = await pool.query('SELECT id FROM businesses WHERE user_id = $1 LIMIT 1', [userId]);
  return res.rows[0]?.id || null;
}

// ─── GET /api/products ─────────────────────────────────────────
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = await getBusinessIdForUser(req.user!.userId);
    if (!businessId) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();
    const query = `
      SELECT
        p.*,
        COALESCE(SUM(s.units_sold), 0) AS total_units_sold,
        COALESCE(SUM(s.revenue_lkr), 0) AS total_revenue_lkr,
        pp.priority AS current_priority,
        pp.score AS priority_score,
        CASE
          WHEN p.price_lkr > 0 AND p.cost_lkr IS NOT NULL THEN
            ROUND(((p.price_lkr - p.cost_lkr) / p.price_lkr * 100)::numeric, 1)
          ELSE NULL
        END AS margin_pct
      FROM products p
      LEFT JOIN sales_records s ON s.product_id = p.id
      LEFT JOIN (
        SELECT DISTINCT ON (product_id) product_id, priority, score
        FROM product_priorities
        ORDER BY product_id, generated_at DESC
      ) pp ON pp.product_id = p.id
      WHERE p.business_id = $1
      GROUP BY p.id, pp.priority, pp.score
      ORDER BY p.created_at DESC;
    `;

    const result = await pool.query(query, [businessId]);
    res.json({ success: true, products: result.rows });
  } catch (err: any) {
    console.error('[Products] List error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch products', details: err.message });
  }
});

// ─── GET /api/products/import/template ─────────────────────────
router.get('/import/template', authenticate, (_req: AuthRequest, res: Response): void => {
  const csvTemplate = [
    'Name,Category,Price_LKR,Cost_LKR,Stock_Qty,Description',
    '"Ceylon Cinnamon Quills (100g)","Spices",1450.00,850.00,45,"Premium grade Ceylon alba cinnamon quills"',
    '"Handwoven Cotton Sarong","Apparel",3200.00,1800.00,20,"Traditional vibrant Sri Lankan cotton sarong"',
    '"Pure Kithul Treacle (375ml)","Food",1150.00,680.00,30,"100% natural organic kithul palm treacle"',
    '"Silver Tips Ceylon White Tea (50g)","Tea",4500.00,2800.00,15,"Handpicked silver needle high-grown white tea"',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="growthos_products_template.csv"');
  res.send(csvTemplate);
});

// ─── GET /api/products/:id ─────────────────────────────────────
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = await getBusinessIdForUser(req.user!.userId);
    if (!businessId) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND business_id = $2',
      [req.params.id, businessId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.json({ success: true, product: result.rows[0] });
  } catch (err: any) {
    console.error('[Products] Get error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// ─── POST /api/products ────────────────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = await getBusinessIdForUser(req.user!.userId);
    if (!businessId) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const { name, category, price_lkr, cost_lkr, stock_qty, description, image_url } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, error: 'Product name is required' });
      return;
    }

    const price = parseFloat(price_lkr);
    if (isNaN(price) || price <= 0) {
      res.status(400).json({ success: false, error: 'Price in LKR must be greater than 0' });
      return;
    }

    const cost = cost_lkr !== undefined && cost_lkr !== null && cost_lkr !== '' ? parseFloat(cost_lkr) : null;
    const stock = stock_qty !== undefined && stock_qty !== null ? parseInt(stock_qty, 10) : 0;

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO products (business_id, name, category, price_lkr, cost_lkr, stock_qty, description, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        businessId,
        name.trim(),
        (category || 'general').trim().toLowerCase(),
        price,
        cost,
        isNaN(stock) ? 0 : Math.max(0, stock),
        (description || '').trim(),
        image_url || null,
      ]
    );

    res.status(201).json({ success: true, product: result.rows[0] });
  } catch (err: any) {
    console.error('[Products] Create error:', err);
    res.status(500).json({ success: false, error: 'Failed to create product', details: err.message });
  }
});

// ─── PUT /api/products/:id ─────────────────────────────────────
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = await getBusinessIdForUser(req.user!.userId);
    if (!businessId) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const { name, category, price_lkr, cost_lkr, stock_qty, description, image_url } = req.body;

    const price = price_lkr !== undefined ? parseFloat(price_lkr) : undefined;
    if (price !== undefined && (isNaN(price) || price <= 0)) {
      res.status(400).json({ success: false, error: 'Price in LKR must be greater than 0' });
      return;
    }

    const cost = cost_lkr !== undefined ? (cost_lkr === '' || cost_lkr === null ? null : parseFloat(cost_lkr)) : undefined;
    const stock = stock_qty !== undefined ? parseInt(stock_qty, 10) : undefined;

    const pool = getPool();

    // Check ownership first
    const existing = await pool.query('SELECT id FROM products WHERE id = $1 AND business_id = $2', [
      req.params.id,
      businessId,
    ]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const result = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           price_lkr = COALESCE($3, price_lkr),
           cost_lkr = COALESCE($4, cost_lkr),
           stock_qty = COALESCE($5, stock_qty),
           description = COALESCE($6, description),
           image_url = COALESCE($7, image_url)
       WHERE id = $8 AND business_id = $9
       RETURNING *`,
      [
        name ? name.trim() : null,
        category ? category.trim().toLowerCase() : null,
        price,
        cost,
        stock !== undefined && !isNaN(stock) ? Math.max(0, stock) : null,
        description !== undefined ? description.trim() : null,
        image_url !== undefined ? image_url : null,
        req.params.id,
        businessId,
      ]
    );

    res.json({ success: true, product: result.rows[0] });
  } catch (err: any) {
    console.error('[Products] Update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update product', details: err.message });
  }
});

// ─── DELETE /api/products/:id ──────────────────────────────────
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = await getBusinessIdForUser(req.user!.userId);
    if (!businessId) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND business_id = $2 RETURNING id',
      [req.params.id, businessId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.json({ success: true, message: 'Product deleted successfully', id: req.params.id });
  } catch (err: any) {
    console.error('[Products] Delete error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete product', details: err.message });
  }
});

// ─── Helper for CSV line parsing ──────────────────────────────
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── POST /api/products/import ────────────────────────────────
router.post('/import', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = await getBusinessIdForUser(req.user!.userId);
    if (!businessId) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      res.status(400).json({ success: false, error: 'csvData string is required' });
      return;
    }

    const rawLines = csvData.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (rawLines.length <= 1) {
      res.status(400).json({ success: false, error: 'CSV file contains no product data rows' });
      return;
    }

    // Inspect headers
    const headerLine = rawLines[0];
    const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().replace(/[\s_-]+/g, ''));

    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('product') || h.includes('title'));
    const priceIdx = headers.findIndex(h => h.includes('price'));
    const costIdx = headers.findIndex(h => h.includes('cost'));
    const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('quantity'));
    const catIdx = headers.findIndex(h => h.includes('cat') || h.includes('type'));
    const descIdx = headers.findIndex(h => h.includes('desc'));

    if (nameIdx === -1 || priceIdx === -1) {
      res.status(400).json({
        success: false,
        error: 'CSV must contain at least "Name" and "Price" columns.',
      });
      return;
    }

    const pool = getPool();
    const imported: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line) continue;

      const cells = parseCsvLine(line);
      const name = cells[nameIdx];
      const rawPrice = cells[priceIdx];

      if (!name) {
        errors.push(`Row ${i}: Missing product name`);
        continue;
      }

      const price = parseFloat(rawPrice);
      if (isNaN(price) || price <= 0) {
        errors.push(`Row ${i} ("${name}"): Invalid price '${rawPrice}'`);
        continue;
      }

      const cost = costIdx !== -1 && cells[costIdx] ? parseFloat(cells[costIdx]) : null;
      const stock = stockIdx !== -1 && cells[stockIdx] ? parseInt(cells[stockIdx], 10) : 0;
      const category = catIdx !== -1 && cells[catIdx] ? cells[catIdx].toLowerCase() : 'general';
      const description = descIdx !== -1 && cells[descIdx] ? cells[descIdx] : '';

      try {
        const insertRes = await pool.query(
          `INSERT INTO products (business_id, name, category, price_lkr, cost_lkr, stock_qty, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            businessId,
            name,
            category,
            price,
            isNaN(cost as number) ? null : cost,
            isNaN(stock) ? 0 : Math.max(0, stock),
            description,
          ]
        );
        imported.push(insertRes.rows[0]);
      } catch (insertErr: any) {
        errors.push(`Row ${i} ("${name}"): ${insertErr.message}`);
      }
    }

    res.json({
      success: true,
      count: imported.length,
      imported,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('[Products] Import error:', err);
    res.status(500).json({ success: false, error: 'Failed to import CSV', details: err.message });
  }
});

export default router;
