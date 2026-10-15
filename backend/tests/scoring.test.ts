import { describe, it, expect } from 'vitest';
import {
  calculateProductScore,
  ProductScoringInput,
  ActiveFestival,
} from '../lib/scoring.js';

describe('Deterministic Product Scoring Engine', () => {
  const baseProduct: ProductScoringInput = {
    id: 'prod-001',
    name: 'Organic Ceylon Cinnamon Quills (100g)',
    category: 'spices',
    price_lkr: 1850.0,
    cost_lkr: 950.0,
    stock_qty: 45,
    total_units_sold: 25,
    total_revenue_lkr: 46250.0,
  };

  it('calculates high margin and healthy velocity correctly', () => {
    const res = calculateProductScore(baseProduct, []);

    expect(res.product_id).toBe('prod-001');
    expect(res.margin_pct).toBeCloseTo(48.6, 1);
    expect(res.margin_score).toBe(35); // 45% - 60% margin = 35 points
    expect(res.velocity_score).toBe(30); // stock >= 10 & sales >= 20 = 30 points
    expect(res.festival_boost_score).toBe(0);
    expect(res.total_score).toBe(65);
    expect(res.priority).toBe('PROMOTE_MORE');
    expect(res.data_missing).toHaveLength(0);
  });

  it('handles missing cost price gracefully and records data_missing', () => {
    const productNoCost: ProductScoringInput = {
      ...baseProduct,
      cost_lkr: null,
    };

    const res = calculateProductScore(productNoCost, []);
    expect(res.margin_score).toBe(20); // Default estimate for missing cost
    expect(res.margin_pct).toBeNull();
    expect(res.data_missing).toContain('cost_price');
  });

  it('penalizes out-of-stock items with 0 velocity points', () => {
    const outOfStockProduct: ProductScoringInput = {
      ...baseProduct,
      stock_qty: 0,
    };

    const res = calculateProductScore(outOfStockProduct, []);
    expect(res.velocity_score).toBe(0);
  });

  it('applies festival boost when product category matches upcoming festival', () => {
    const upcomingFestival: ActiveFestival = {
      id: 'fest-avurudu',
      key: 'sinhala_tamil_new_year',
      name_en: 'Sinhala and Tamil New Year',
      date: '2026-04-14',
      date_confirmed: true,
      lead_days: 30,
      categories_boosted: ['clothing', 'spices', 'groceries', 'sweets'],
      days_until: 14,
    };

    const res = calculateProductScore(baseProduct, [upcomingFestival]);
    expect(res.festival_boost.applied).toBe(true);
    expect(res.festival_boost.festival_name).toBe('Sinhala and Tamil New Year');
    expect(res.festival_boost_score).toBeGreaterThan(0);
    expect(res.total_score).toBeGreaterThan(65);
  });

  it('does not apply boost if product category is not boosted by festival', () => {
    const electronicsFestival: ActiveFestival = {
      id: 'fest-tech',
      key: 'tech_promo',
      name_en: 'Tech Expo',
      date: '2026-04-14',
      date_confirmed: true,
      lead_days: 30,
      categories_boosted: ['electronics', 'mobile'],
      days_until: 10,
    };

    const res = calculateProductScore(baseProduct, [electronicsFestival]);
    expect(res.festival_boost.applied).toBe(false);
    expect(res.festival_boost_score).toBe(0);
  });
});
