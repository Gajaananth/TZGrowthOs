/**
 * Tradiq Zium GrowthOS API Client
 */

const API_BASE = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  details?: string;
  [key: string]: any;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  category: string;
  price_lkr: number | string;
  cost_lkr?: number | string | null;
  stock_qty: number;
  description?: string;
  image_url?: string | null;
  is_demo: boolean;
  total_units_sold?: number;
  total_revenue_lkr?: number;
  margin_pct?: number | null;
  current_priority?: 'PROMOTE_MORE' | 'MAINTAIN' | 'REDUCE' | null;
  priority_score?: number | null;
  created_at: string;
}

export function getToken(): string | null {
  return localStorage.getItem('growthos_token');
}

export function setToken(token: string): void {
  localStorage.setItem('growthos_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('growthos_token');
  localStorage.removeItem('growthos_user');
  localStorage.removeItem('growthos_business');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({
    success: false,
    error: `HTTP error ${res.status}: ${res.statusText}`,
  }));

  if (!res.ok && !data.error) {
    data.error = `HTTP error ${res.status}: ${res.statusText}`;
  }

  return data as T;
}

// ─── Health API ───────────────────────────────────────────────
export async function fetchHealth() {
  return apiRequest<{
    status: string;
    app: string;
    version: string;
    gemini: boolean;
    database: boolean;
    timestamp: string;
  }>('/health');
}

// ─── Auth API ─────────────────────────────────────────────────
export async function loginUser(credentials: { email: string; password: string }) {
  return apiRequest<{
    success: boolean;
    token?: string;
    user?: { id: string; email: string };
    business?: any;
    error?: string;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function registerUser(details: {
  email: string;
  password: string;
  businessName?: string;
  businessType?: string;
  city?: string;
}) {
  return apiRequest<{
    success: boolean;
    token?: string;
    user?: { id: string; email: string };
    business?: any;
    error?: string;
  }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  });
}

export async function fetchMe() {
  return apiRequest<{
    success: boolean;
    user?: { id: string; email: string; created_at: string };
    business?: any;
    error?: string;
  }>('/auth/me');
}

// ─── Products API (Phase 2) ───────────────────────────────────
export async function fetchProducts() {
  return apiRequest<{
    success: boolean;
    products: Product[];
    error?: string;
  }>('/products');
}

export async function createProduct(product: Partial<Product>) {
  return apiRequest<{
    success: boolean;
    product: Product;
    error?: string;
  }>('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export async function updateProduct(id: string, product: Partial<Product>) {
  return apiRequest<{
    success: boolean;
    product: Product;
    error?: string;
  }>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(id: string) {
  return apiRequest<{
    success: boolean;
    message?: string;
    error?: string;
  }>(`/products/${id}`, {
    method: 'DELETE',
  });
}

export async function importProductsCsv(csvData: string) {
  return apiRequest<{
    success: boolean;
    count: number;
    imported: Product[];
    errors?: string[];
    error?: string;
  }>('/products/import', {
    method: 'POST',
    body: JSON.stringify({ csvData }),
  });
}

// ─── Demo API (Phase 2) ───────────────────────────────────────
export async function seedDemoData() {
  return apiRequest<{
    success: boolean;
    message: string;
    productsCount: number;
    products: Product[];
    error?: string;
  }>('/demo/seed', {
    method: 'POST',
  });
}

export async function clearDemoData() {
  return apiRequest<{
    success: boolean;
    message: string;
    deletedCount: number;
    error?: string;
  }>('/demo/clear', {
    method: 'POST',
  });
}

// ─── Phase 3: Priorities, Festivals, & Strategist ────────────
export interface PriorityItem {
  priority_id?: string;
  product_id: string;
  product_name: string;
  category: string;
  price_lkr: number | string;
  cost_lkr?: number | string | null;
  stock_qty: number;
  priority: 'PROMOTE_MORE' | 'MAINTAIN' | 'REDUCE';
  score: number | string;
  reasons: string[] | string;
  data_used?: any;
  data_missing?: string[];
  festival_boost?: any;
  is_demo?: boolean;
  generated_at?: string;
}

export interface Festival {
  id: string;
  key: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  year: number;
  date: string | null;
  date_confirmed: boolean;
  lead_days: number;
  categories_boosted: string[] | string;
  sensitivity_rules: string[] | string;
  source_note?: string;
  days_until?: number | null;
  is_approaching?: boolean;
}

export interface GrowthPlan {
  storeName: string;
  city: string;
  totalProducts: number;
  totalCatalogValue: number;
  topPromoteProducts: PriorityItem[];
  approachingFestivals: any[];
  inventoryAlerts: any[];
  pendingApprovalsCount: number;
  nextActions: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    actionUrl: string;
  }>;
}

export async function generatePriorities() {
  return apiRequest<{
    success: boolean;
    message: string;
    priorities: PriorityItem[];
    error?: string;
  }>('/priorities/generate', {
    method: 'POST',
  });
}

export async function fetchPriorities() {
  return apiRequest<{
    success: boolean;
    priorities: PriorityItem[];
    error?: string;
  }>('/priorities');
}

export async function fetchFestivals() {
  return apiRequest<{
    success: boolean;
    festivals: Festival[];
    error?: string;
  }>('/festivals');
}

export async function updateFestival(id: string, data: Partial<Festival>) {
  return apiRequest<{
    success: boolean;
    festival: Festival;
    error?: string;
  }>(`/festivals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function confirmFestivalDate(id: string, date?: string) {
  return apiRequest<{
    success: boolean;
    message: string;
    festival: Festival;
    error?: string;
  }>(`/festivals/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

export async function fetchGrowthPlan() {
  return apiRequest<{
    success: boolean;
    plan: GrowthPlan;
    error?: string;
  }>('/strategist/plan');
}

// ─── Phase 4: Campaigns & Assets ─────────────────────────────

export type CampaignStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export interface CaptionSet {
  en: string;
  si: string;
  ta: string;
  singlish: string;
  tanglish: string;
}

export interface SensitivityVerdict {
  passed: boolean;
  flags: string[];
  suggestions: string[];
  overall_verdict: string;
}

export interface ContentAsset {
  id: string;
  campaign_id: string;
  asset_type: 'CAPTION' | 'HASHTAGS' | 'POSTER_CONCEPT' | 'IMAGE_PROMPT';
  platform: string;
  language: string;
  body: string;
  needs_native_review: boolean;
  is_confirmed: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalEvent {
  id: string;
  campaign_id: string;
  user_id: string;
  user_email?: string;
  action: 'CREATED' | 'GENERATED' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'ASSET_EDITED' | 'NATIVE_CONFIRMED';
  note?: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  business_id: string;
  product_id: string;
  product_name: string;
  product_category: string;
  product_price_lkr: number | string;
  product_description?: string;
  festival_id?: string | null;
  festival_name?: string | null;
  festival_rules?: string | string[];
  objective: string;
  platforms: string | string[];
  status: CampaignStatus;
  approved_at?: string | null;
  asset_count?: number;
  has_pending_native_review?: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchCampaigns() {
  return apiRequest<{ success: boolean; campaigns: Campaign[]; error?: string }>('/campaigns');
}

export async function fetchCampaign(id: string) {
  return apiRequest<{
    success: boolean;
    campaign: Campaign;
    assets: ContentAsset[];
    approvalEvents: ApprovalEvent[];
    error?: string;
  }>(`/campaigns/${id}`);
}

export async function createCampaign(data: {
  product_id: string;
  festival_id?: string | null;
  objective?: string;
  platforms?: string[];
}) {
  return apiRequest<{ success: boolean; campaign: Campaign; error?: string }>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateCampaignAssets(id: string) {
  return apiRequest<{
    success: boolean;
    message: string;
    status: string;
    assets: ContentAsset[];
    sensitivity: SensitivityVerdict;
    error?: string;
  }>(`/campaigns/${id}/generate`, { method: 'POST' });
}

export async function approveCampaign(id: string, note?: string) {
  return apiRequest<{ success: boolean; message: string; campaign: Campaign; error?: string }>(
    `/campaigns/${id}/approve`,
    { method: 'POST', body: JSON.stringify({ note }) }
  );
}

export async function rejectCampaign(id: string, reason?: string) {
  return apiRequest<{ success: boolean; message: string; campaign: Campaign; error?: string }>(
    `/campaigns/${id}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) }
  );
}

export async function requestCampaignChanges(id: string, note?: string) {
  return apiRequest<{ success: boolean; message: string; campaign: Campaign; error?: string }>(
    `/campaigns/${id}/request-changes`,
    { method: 'POST', body: JSON.stringify({ note }) }
  );
}

export async function updateAsset(assetId: string, body: string) {
  return apiRequest<{ success: boolean; asset: ContentAsset; error?: string }>(
    `/assets/${assetId}`,
    { method: 'PUT', body: JSON.stringify({ body }) }
  );
}

export async function confirmNativeReview(assetId: string) {
  return apiRequest<{ success: boolean; asset: ContentAsset; error?: string }>(
    `/assets/${assetId}/confirm-native`,
    { method: 'POST' }
  );
}

// ─── Phase 5: SEO Helper ──────────────────────────────────────

export interface KeywordItem {
  keyword: string;
  trend_badge: 'TRENDING_NOW' | 'HIGH_VOLUME' | 'LOCAL_INTENT' | 'SEASONAL_BOOST' | 'LONG_TAIL' | string;
  trend_reason: string;
  competition?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
}

export interface HashtagItem {
  tag: string;
  recommendation_level: 'MUST_USE' | 'RECOMMENDED' | 'NICHE' | string;
  reason: string;
}

export interface LanguagePack {
  meta_title: string;
  meta_description: string;
  captions: string[];
  keywords: KeywordItem[];
  hashtags: HashtagItem[];
}

export interface SeoOutput {
  meta_title: string;
  meta_description: string;
  local_keywords: string[];
  gmb_description: string;
  gmb_posts: string[];
  schema_snippet: string;
  tips: string[];
  current_season_trend?: string;
  best_tags_advice?: string;
  languages?: {
    en: LanguagePack;
    si: LanguagePack;
    ta: LanguagePack;
    singlish: LanguagePack;
    tanglish: LanguagePack;
  };
}

export async function generateSeoPack(productId: string) {
  return apiRequest<{
    success: boolean;
    product: { id: string; name: string };
    seo: SeoOutput;
    aiMeta?: {
      tokensIn: number;
      tokensOut: number;
      totalTokens: number;
      latencyMs: number;
      model: string;
    };
    error?: string;
  }>('/seo/generate', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
}

export interface AiRunLogItem {
  id: string;
  feature: string;
  model: string;
  latency_ms: number;
  success: boolean;
  tokens_in: number;
  tokens_out: number;
  total_tokens: number;
  error_message?: string;
  created_at: string;
}

export interface AiFeatureStats {
  feature: string;
  call_count?: number;
  calls?: number;
  tokens_in: number;
  tokens_out: number;
  total_tokens: number;
  avg_latency_ms: number;
}

export interface TokenUsageData {
  totalCalls: number;
  successfulCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalTokens: number;
  avgLatencyMs: number;
  costUsd: number;
  costLkr: number;
  model: string;
  byFeature: AiFeatureStats[];
  recentRuns: AiRunLogItem[];
}

// ─── Phase 5: Insights ────────────────────────────────────────

export interface InsightsSummary {
  business: { name: string; city: string; type: string };
  catalog: {
    totalProducts: number;
    totalStockUnits: number;
    catalogValueLkr: number;
    outOfStockCount: number;
    lowStockCount: number;
  };
  campaigns: {
    total: number;
    approved: number;
    inReview: number;
    draft: number;
    rejected: number;
  };
  assets: { total: number; captions: number; confirmed: number };
  ai: {
    totalCallsLast30Days: number;
    successfulCalls?: number;
    totalTokensIn?: number;
    totalTokensOut?: number;
    totalTokens?: number;
    avgLatencyMs?: number;
    featureBreakdown: Record<string, number>;
    featuresDetailed?: AiFeatureStats[];
    recentRuns?: AiRunLogItem[];
  };
  priorities: { distribution: Record<string, number>; topProducts: any[] };
  recentApproved: any[];
}

export async function fetchInsightsSummary() {
  return apiRequest<{ success: boolean; summary: InsightsSummary; error?: string }>(
    '/insights/summary'
  );
}

export async function fetchTokenUsage() {
  return apiRequest<{ success: boolean; tokens: TokenUsageData; error?: string }>(
    '/insights/tokens'
  );
}

// ─── Phase 5: Chat ────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  answer: string;
  action_items: string[];
  related_products: string[];
  confidence: 'high' | 'medium' | 'low';
}

export async function sendChatMessage(
  question: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
) {
  return apiRequest<{
    success: boolean;
    response: ChatResponse;
    aiMeta?: {
      tokensIn: number;
      tokensOut: number;
      totalTokens: number;
      latencyMs: number;
      model: string;
    };
    error?: string;
  }>(
    '/chat/message',
    {
      method: 'POST',
      body: JSON.stringify({ question, history }),
    }
  );
}

// ─── Phase 6: Settings & Demo Utilities ──────────────────────

export async function updateBusinessProfile(data: {
  name?: string;
  business_type?: string;
  city?: string;
  brand_tone?: string;
  default_language?: string;
}) {
  return apiRequest<{ success: boolean; business: any; error?: string }>(
    '/auth/business',
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
}



