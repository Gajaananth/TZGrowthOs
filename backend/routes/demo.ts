import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

async function getBusinessId(userId: string): Promise<string | null> {
  const pool = getPool();
  const res = await pool.query('SELECT id FROM businesses WHERE user_id = $1 LIMIT 1', [userId]);
  return res.rows[0]?.id || null;
}

// ─── POST /api/demo/seed ───────────────────────────────────────
router.post('/seed', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = await getBusinessId(req.user!.userId);
    if (!businessId) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();

    // 1. Clear previous demo products for this business
    await pool.query('DELETE FROM products WHERE business_id = $1 AND is_demo = TRUE', [businessId]);

    // 2. Realistic Sri Lankan Retail Catalog
    const demoCatalog = [
      {
        name: 'Organic Ceylon Cinnamon Quills (Alba Grade, 100g)',
        category: 'spices',
        price: 1850.00,
        cost: 950.00,
        stock: 55,
        desc: 'Premium Alba grade pure Ceylon cinnamon sticks harvested from Southern Sri Lanka. Highest essential oil content and sweet aroma.',
        salesUnits: 42,
      },
      {
        name: 'Handcrafted Sri Lankan Batik Linen Shirt (Classic Motif)',
        category: 'clothing',
        price: 4500.00,
        cost: 2300.00,
        stock: 14,
        desc: 'Authentic wax-resist hand-dyed batik on premium breathable linen. Designed for tropical comfort and festive celebrations.',
        salesUnits: 28,
      },
      {
        name: 'Pure Sinharaja Organic Kithul Treacle (750ml Bottle)',
        category: 'groceries',
        price: 1650.00,
        cost: 880.00,
        stock: 32,
        desc: 'Traditional pure kithul palm treacle tapped naturally in Sinharaja rainforest buffer zone. No added sugar or artificial preservatives.',
        salesUnits: 65,
      },
      {
        name: 'Nuwara Eliya High-Grown Pekoe Tea (250g Tin)',
        category: 'tea',
        price: 1400.00,
        cost: 650.00,
        stock: 75,
        desc: 'Single-estate delicate high-grown Ceylon black tea with crisp golden cup and subtle floral notes.',
        salesUnits: 80,
      },
      {
        name: 'Traditional Brass Peacock Oil Lamp (Pahana, 14-inch)',
        category: 'handicrafts',
        price: 6500.00,
        cost: 3900.00,
        stock: 5, // Low stock - perfect for priority score urgency!
        desc: 'Solid heavy-cast polished brass oil lamp handcrafted by hereditary artisans in Pilimathalawa for auspicious occasions.',
        salesUnits: 12,
      },
      {
        name: 'King Coconut & Gotu Kola Hair Tonic (200ml)',
        category: 'cosmetics',
        price: 1100.00,
        cost: 450.00,
        stock: 40,
        desc: 'Traditional Ayurvedic cooling hair serum infused with fresh King Coconut oil, brahmi, and gotu kola.',
        salesUnits: 38,
      },
      {
        name: 'Roasted Jaffna Masala Curry Powder (250g Airtight Pouch)',
        category: 'spices',
        price: 850.00,
        cost: 360.00,
        stock: 90,
        desc: 'Authentic sun-dried roasted spice blend crafted according to Northern Sri Lankan heritage recipes.',
        salesUnits: 95,
      },
      {
        name: 'Handwoven Dumbara Decorative Table Runner (Cotton)',
        category: 'handicrafts',
        price: 3200.00,
        cost: 1600.00,
        stock: 4, // Critical low stock
        desc: 'UNESCO-recognized traditional Dumbara weaving featuring geometric motifs in pure hand-dyed cotton yarn.',
        salesUnits: 9,
      },
    ];

    const insertedProducts: any[] = [];
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const item of demoCatalog) {
      const prodRes = await pool.query(
        `INSERT INTO products (business_id, name, category, price_lkr, cost_lkr, stock_qty, description, is_demo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         RETURNING *`,
        [businessId, item.name, item.category, item.price, item.cost, item.stock, item.desc]
      );
      const product = prodRes.rows[0];
      insertedProducts.push(product);

      // Seed 30-day sales history
      await pool.query(
        `INSERT INTO sales_records (product_id, period_start, period_end, units_sold, revenue_lkr, is_demo)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [
          product.id,
          thirtyDaysAgo.toISOString().split('T')[0],
          today.toISOString().split('T')[0],
          item.salesUnits,
          item.salesUnits * item.price,
        ]
      );
    }

    // 3. Seed Canonical 2026 Sri Lankan Festivals if not already present
    const festivalCount = await pool.query('SELECT COUNT(*) FROM festivals WHERE year = 2026');
    if (parseInt(festivalCount.rows[0].count, 10) === 0) {
      const festivalsData = [
        {
          key: 'avurudu_2026',
          name_en: 'Sinhala & Tamil New Year (Aluth Avurudda / Puthandu)',
          name_si: 'සිංහල සහ දෙමළ අලුත් අවුරුද්ද',
          name_ta: 'சிங்கள மற்றும் தமிழ் புத்தாண்டு',
          year: 2026,
          date: '2026-04-14',
          date_confirmed: false, // Per prompt: seed as unconfirmed, owner must verify!
          lead_days: 21,
          categories: JSON.stringify(['clothing', 'apparel', 'food', 'groceries', 'spices', 'sweets', 'handicrafts']),
          rules: JSON.stringify([
            'Emphasize auspicious timings (Nekath) and family gathering joy',
            'Avoid overly commercialized or aggressive sales pressure',
            'Highlight freshness, traditional purity, and prosperity greetings'
          ]),
          source_note: 'Traditional calendar observation — verify exact Nekath timings with national gazette',
        },
        {
          key: 'vesak_2026',
          name_en: 'Vesak Full Moon Poya',
          name_si: 'වෙසක් පුර පසළොස්වක පෝය',
          name_ta: 'வைகாசி விசாகம்',
          year: 2026,
          date: '2026-05-31',
          date_confirmed: false,
          lead_days: 14,
          categories: JSON.stringify(['handicrafts', 'oil lamps', 'white clothing', 'decor', 'vegetarian food']),
          rules: JSON.stringify([
            'Strict adherence to spiritual respect and serene tone',
            'Never promote alcohol, meat, or frivolous luxury items',
            'Highlight Dansala support, lantern making (Kudu), and inner peace'
          ]),
          source_note: 'Subject to lunar calendar sighting and official Ministry of Buddha Sasana declaration',
        },
        {
          key: 'eid_2026',
          name_en: 'Eid al-Fitr (Ramazan Festival)',
          name_si: 'ඊද් උල්-ෆිත්ර් (රාමසාන් උත්සවය)',
          name_ta: 'ஈகைத் திருநாள் (ரம்சான்)',
          year: 2026,
          date: '2026-03-21',
          date_confirmed: false,
          lead_days: 14,
          categories: JSON.stringify(['clothing', 'fashion', 'sweets', 'groceries', 'fragrances', 'gifts']),
          rules: JSON.stringify([
            'Respect Ramadan fasting boundaries before Eid announcement',
            'Emphasize sharing with charity (Zakat), family warmth, and modest elegance'
          ]),
          source_note: 'Dependent on moon sighting by Colombo Grand Mosque Hilal Committee',
        },
        {
          key: 'deepavali_2026',
          name_en: 'Deepavali (Festival of Lights)',
          name_si: 'දීපාවලි උත්සවය',
          name_ta: 'தீபாவளி திருநாள்',
          year: 2026,
          date: '2026-11-08',
          date_confirmed: false,
          lead_days: 14,
          categories: JSON.stringify(['sweets', 'clothing', 'jewellery', 'handicrafts', 'lamps']),
          rules: JSON.stringify([
            'Celebrate the triumph of light over darkness and knowledge over ignorance',
            'Feature traditional brass lamps, silk sarees, and festival sweet boxes'
          ]),
          source_note: 'Calculated by Hindu panchangam — verify with Ministry of Hindu Religious Affairs',
        },
        {
          key: 'christmas_2026',
          name_en: 'Christmas & Holiday Season',
          name_si: 'නත්තල් උත්සවය',
          name_ta: 'கிறிஸ்துமஸ் பெருநாள்',
          year: 2026,
          date: '2026-12-25',
          date_confirmed: true, // Fixed calendar date
          lead_days: 25,
          categories: JSON.stringify(['gifts', 'hampers', 'clothing', 'bakery', 'confectionery']),
          rules: JSON.stringify([
            'Family togetherness, gift sharing, and festive culinary celebrations'
          ]),
          source_note: 'Fixed Gregorian calendar holiday',
        },
      ];

      for (const fest of festivalsData) {
        await pool.query(
          `INSERT INTO festivals (key, name_en, name_si, name_ta, year, date, date_confirmed, lead_days, categories_boosted, sensitivity_rules, source_note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            fest.key,
            fest.name_en,
            fest.name_si,
            fest.name_ta,
            fest.year,
            fest.date,
            fest.date_confirmed,
            fest.lead_days,
            fest.categories,
            fest.rules,
            fest.source_note,
          ]
        );
      }
    }

    res.json({
      success: true,
      message: 'Demo inventory and Sri Lankan festival calendar seeded successfully',
      productsCount: insertedProducts.length,
      products: insertedProducts,
    });
  } catch (err: any) {
    console.error('[Demo] Seed error:', err);
    res.status(500).json({ success: false, error: 'Failed to seed demo data', details: err.message });
  }
});

// ─── POST /api/demo/clear ──────────────────────────────────────
router.post('/clear', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = await getBusinessId(req.user!.userId);
    if (!businessId) {
      res.status(404).json({ success: false, error: 'Business profile not found' });
      return;
    }

    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM products WHERE business_id = $1 AND is_demo = TRUE RETURNING id',
      [businessId]
    );

    res.json({
      success: true,
      message: 'Demo products and associated data cleared',
      deletedCount: result.rows.length,
    });
  } catch (err: any) {
    console.error('[Demo] Clear error:', err);
    res.status(500).json({ success: false, error: 'Failed to clear demo data' });
  }
});

export default router;
