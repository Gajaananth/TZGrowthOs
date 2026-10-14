/**
 * Deterministic Product Scoring Engine for Tradiq Zium GrowthOS
 *
 * Computes product priority scores strictly in deterministic code.
 * Gemini AI is ONLY used downstream for explaining the numbers in human language.
 */

export interface ProductScoringInput {
  id: string;
  name: string;
  category: string;
  price_lkr: number;
  cost_lkr: number | null;
  stock_qty: number;
  total_units_sold: number;
  total_revenue_lkr: number;
}

export interface ActiveFestival {
  id: string;
  key: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  date: string | null;
  date_confirmed: boolean;
  lead_days: number;
  categories_boosted: string[];
  days_until?: number;
}

export interface FestivalBoostResult {
  applied: boolean;
  festival_id?: string;
  festival_name?: string;
  boost_points: number;
  days_until?: number;
  reason?: string;
}

export interface ScoringResult {
  product_id: string;
  priority: 'PROMOTE_MORE' | 'MAINTAIN' | 'REDUCE';
  total_score: number; // 0 - 100 scale
  margin_score: number; // 0 - 40
  velocity_score: number; // 0 - 30
  festival_boost_score: number; // 0 - 30
  margin_pct: number | null;
  festival_boost: FestivalBoostResult;
  data_used: {
    price_lkr: number;
    cost_lkr: number | null;
    stock_qty: number;
    units_sold_30d: number;
    margin_pct: number | null;
  };
  data_missing: string[];
}

/**
 * Calculate deterministic score for a single product
 */
export function calculateProductScore(
  product: ProductScoringInput,
  activeFestivals: ActiveFestival[] = []
): ScoringResult {
  const dataMissing: string[] = [];

  // ─── 1. Profit Margin Score (0 to 40 points) ────────────────
  let marginPct: number | null = null;
  let marginScore = 0;

  if (product.cost_lkr === null || product.cost_lkr === undefined || isNaN(product.cost_lkr)) {
    dataMissing.push('cost_price');
    // Default estimated margin for retail when cost is missing: modest 20 points
    marginScore = 20;
  } else if (product.price_lkr > 0) {
    marginPct = Math.round(((product.price_lkr - product.cost_lkr) / product.price_lkr) * 1000) / 10;
    if (marginPct >= 60) {
      marginScore = 40;
    } else if (marginPct >= 45) {
      marginScore = 35;
    } else if (marginPct >= 30) {
      marginScore = 25;
    } else if (marginPct >= 15) {
      marginScore = 15;
    } else if (marginPct > 0) {
      marginScore = 8;
    } else {
      marginScore = 0; // Selling at a loss
    }
  }

  // ─── 2. Stock & Velocity Score (0 to 30 points) ─────────────
  let velocityScore = 0;
  const stock = product.stock_qty || 0;
  const sales = product.total_units_sold || 0;

  if (stock <= 0) {
    // Out of stock: cannot promote what cannot be fulfilled
    velocityScore = 0;
  } else if (stock <= 5 && sales > 10) {
    // High velocity but critically low stock: prioritize quick clearance or alert restock
    velocityScore = 20;
  } else if (stock >= 10 && sales >= 20) {
    // Fast-mover with healthy inventory: prime candidate for aggressive promotion
    velocityScore = 30;
  } else if (stock >= 10 && sales >= 5) {
    // Steady mover with available inventory
    velocityScore = 22;
  } else if (stock > 30 && sales < 5) {
    // Slow mover with excess inventory: promote to free up capital
    velocityScore = 18;
  } else {
    // Normal base velocity
    velocityScore = 12;
  }

  // ─── 3. Festival Boost Score (0 to 30 points) ───────────────
  let festivalBoost: FestivalBoostResult = {
    applied: false,
    boost_points: 0,
  };

  const productCat = (product.category || '').toLowerCase().trim();

  for (const fest of activeFestivals) {
    const boostedCats = (fest.categories_boosted || []).map((c) => c.toLowerCase().trim());
    const isCategoryBoosted = boostedCats.some(
      (cat) => productCat.includes(cat) || cat.includes(productCat)
    );

    if (isCategoryBoosted) {
      // Base boost for matching festival category
      let boost = 25;

      // Extra 5 points if date is confirmed and within lead days
      if (fest.date_confirmed) {
        boost += 5;
      }

      festivalBoost = {
        applied: true,
        festival_id: fest.id,
        festival_name: fest.name_en,
        boost_points: Math.min(30, boost),
        days_until: fest.days_until,
        reason: `Matches festival priority category for ${fest.name_en}`,
      };
      break; // Apply strongest matching festival
    }
  }

  const festivalScore = festivalBoost.boost_points;

  // ─── 4. Total Score & Classification ────────────────────────
  let totalScore = marginScore + velocityScore + festivalScore;

  // Severe penalty if completely out of stock
  if (stock <= 0) {
    totalScore = Math.min(25, totalScore);
  }

  let priority: 'PROMOTE_MORE' | 'MAINTAIN' | 'REDUCE';
  if (stock <= 0) {
    priority = 'REDUCE';
  } else if (totalScore >= 60) {
    priority = 'PROMOTE_MORE';
  } else if (totalScore >= 35) {
    priority = 'MAINTAIN';
  } else {
    priority = 'REDUCE';
  }

  return {
    product_id: product.id,
    priority,
    total_score: Math.min(100, Math.max(0, totalScore)),
    margin_score: marginScore,
    velocity_score: velocityScore,
    festival_boost_score: festivalScore,
    margin_pct: marginPct,
    festival_boost: festivalBoost,
    data_used: {
      price_lkr: product.price_lkr,
      cost_lkr: product.cost_lkr,
      stock_qty: product.stock_qty,
      units_sold_30d: product.total_units_sold,
      margin_pct: marginPct,
    },
    data_missing: dataMissing,
  };
}

/**
 * Filter festivals that are active/approaching relative to reference date (default: today)
 */
export function getApproachingFestivals(
  festivals: any[],
  referenceDate: Date = new Date()
): ActiveFestival[] {
  const active: ActiveFestival[] = [];

  for (const fest of festivals) {
    if (!fest.date) continue;
    const festDate = new Date(fest.date);
    const diffTime = festDate.getTime() - referenceDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const leadDays = fest.lead_days || 14;

    // Active if within lead days window before festival, up to 2 days after
    if (diffDays >= -2 && diffDays <= leadDays) {
      let cats: string[] = [];
      try {
        cats = typeof fest.categories_boosted === 'string'
          ? JSON.parse(fest.categories_boosted)
          : fest.categories_boosted || [];
      } catch {
        cats = [];
      }

      active.push({
        id: fest.id,
        key: fest.key,
        name_en: fest.name_en,
        name_si: fest.name_si,
        name_ta: fest.name_ta,
        date: fest.date,
        date_confirmed: !!fest.date_confirmed,
        lead_days: leadDays,
        categories_boosted: cats,
        days_until: diffDays,
      });
    }
  }

  return active;
}
