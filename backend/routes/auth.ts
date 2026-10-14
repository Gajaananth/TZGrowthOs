import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getPool } from '../db/connection.js';
import { signToken, authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res): Promise<void> => {
  try {
    const { email, password, businessName, businessType, city } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid email is required' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }

    const pool = getPool();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, error: 'An account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRes = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase().trim(), passwordHash]
    );
    const user = userRes.rows[0];

    // Create default business profile for this user
    const storeName = businessName && typeof businessName === 'string' ? businessName.trim() : 'My Retail Store';
    const storeType = businessType && typeof businessType === 'string' ? businessType.trim() : 'retail';
    const storeCity = city && typeof city === 'string' ? city.trim() : 'Colombo';

    const businessRes = await pool.query(
      `INSERT INTO businesses (user_id, name, business_type, city, default_language, brand_tone)
       VALUES ($1, $2, $3, $4, 'en', 'friendly')
       RETURNING *`,
      [user.id, storeName, storeType, storeCity]
    );
    const business = businessRes.rows[0];

    const token = signToken({ userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, email: user.email },
      business,
    });
  } catch (err: any) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ success: false, error: 'Failed to create account', details: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const pool = getPool();
    const userRes = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);

    if (userRes.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const businessRes = await pool.query(
      'SELECT * FROM businesses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
      [user.id]
    );
    const business = businessRes.rows[0] || null;

    const token = signToken({ userId: user.id, email: user.email });

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email },
      business,
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: 'Failed to sign in', details: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    const userRes = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.user!.userId]);

    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const businessRes = await pool.query(
      'SELECT * FROM businesses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
      [req.user!.userId]
    );

    res.json({
      success: true,
      user: userRes.rows[0],
      business: businessRes.rows[0] || null,
    });
  } catch (err: any) {
    console.error('[Auth] Me error:', err);
    res.status(500).json({ success: false, error: 'Failed to load user profile' });
  }
});

export default router;
