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
