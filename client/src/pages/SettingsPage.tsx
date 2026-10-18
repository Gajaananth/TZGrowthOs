import React, { useState, useEffect } from 'react';
import {
  Store, Sparkles, Save, Check, RefreshCw, Trash2,
  Globe, AlertCircle, Database, ShieldCheck, MapPin, Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { updateBusinessProfile, seedDemoData, clearDemoData } from '../services/api';

const SRI_LANKA_CITIES = [
  'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo',
  'Gampaha', 'Kurunegala', 'Matara', 'Batticaloa', 'Anuradhapura', 'Ratnapura'
];

const RETAIL_CATEGORIES = [
  'Fashion & Batik Apparel',
  'Ceylon Spices & Groceries',
  'Pure Ceylon Tea & Exports',
  'Handcrafts & Home Decor',
  'Electronics & Mobile Accessories',
  'Jewelry & Gemstones',
  'Ayurvedic & Wellness Goods',
  'Supermarket & Everyday Goods'
];

const BRAND_TONES = [
  { id: 'friendly', name: 'Friendly & Welcoming', desc: 'Warm, hospitable Sri Lankan tone ideal for social media' },
  { id: 'festive', name: 'Festive & Celebratory', desc: 'High energy tailored for Avurudu, Vesak, and holiday gifting' },
  { id: 'professional', name: 'Trustworthy & Premium', desc: 'Focus on quality, origin certifications, and authentic craft' },
  { id: 'bargain', name: 'Promotional & Value-Driven', desc: 'Urgent clearance, bundle deals, and seasonal discounts' }
];

export const SettingsPage: React.FC = () => {
  const { business } = useAuth();
  const { language, setLanguage, t } = useI18n();

  const [name, setName] = useState(business?.name || 'My Retail Store');
  const [businessType, setBusinessType] = useState(business?.business_type || 'Fashion & Batik Apparel');
  const [city, setCity] = useState(business?.city || 'Colombo');
  const [brandTone, setBrandTone] = useState(business?.brand_tone || 'friendly');
  const [prefLang, setPrefLang] = useState<'en' | 'si' | 'ta'>(language);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (business) {
      if (business.name) setName(business.name);
      if (business.business_type) setBusinessType(business.business_type);
      if (business.city) setCity(business.city);
      if (business.brand_tone) setBrandTone(business.brand_tone);
    }
  }, [business]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await updateBusinessProfile({
        name,
        business_type: businessType,
        city,
        brand_tone: brandTone,
        default_language: prefLang,
      });

      if (res.success) {
        setSaveSuccess(true);
        setLanguage(prefLang);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res.error || 'Failed to update store settings');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Error communicating with settings service');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemo = async () => {
    setDemoLoading(true);
    setDemoMessage(null);
    try {
      const res = await seedDemoData();
      if (res.success) {
        setDemoMessage('Successfully seeded 8 authentic Sri Lankan retail catalog products!');
        setTimeout(() => setDemoMessage(null), 4000);
      } else {
        setDemoMessage('Failed to seed demo catalog: ' + (res.error || 'Unknown error'));
      }
    } catch (err: any) {
      setDemoMessage('Error: ' + err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleClearDemo = async () => {
    if (!window.confirm('Are you sure you want to remove all seeded demo products? Custom products will not be deleted.')) {
      return;
    }
    setDemoLoading(true);
    setDemoMessage(null);
    try {
      const res = await clearDemoData();
      if (res.success) {
        setDemoMessage('All demo products cleared.');
        setTimeout(() => setDemoMessage(null), 4000);
      } else {
        setDemoMessage('Failed to clear demo data.');
      }
    } catch (err: any) {
      setDemoMessage('Error: ' + err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="title-hero" style={{ margin: 0 }}>⚙️ {t('settings.title')}</h1>
        <p className="subtitle-hero" style={{ margin: '0.25rem 0 0' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(440px, 100%), 1fr))', gap: '1.75rem' }}>
        {/* Left Column: Business Profile Form */}
        <div style={{
          background: 'white',
          borderRadius: '0.875rem',
          border: '1px solid var(--border-light)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '0.5rem',
              background: 'var(--primary-50)', color: 'var(--primary-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Store size={19} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                {t('settings.storeConfig')}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Used by Gemini AI to personalize marketing copies and local SEO
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {saveSuccess && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: '0.5rem',
                background: '#dcfce7', border: '1px solid #bbf7d0',
                color: '#15803d', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <Check size={16} />
                <span>Store profile updated successfully!</span>
              </div>
            )}

            {saveError && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: '0.5rem',
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#b91c1c', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                <span>{saveError}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                {t('settings.storeName')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ceylon Heritage Crafts"
                required
                style={{
                  width: '100%', padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem', border: '1px solid var(--border-medium)',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  {t('settings.category')}
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem', border: '1px solid var(--border-medium)',
                    fontSize: '0.85rem', background: 'white'
                  }}
                >
                  {RETAIL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  {t('settings.city')}
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem', border: '1px solid var(--border-medium)',
                    fontSize: '0.85rem', background: 'white'
                  }}
                >
                  {SRI_LANKA_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                {t('settings.brandTone')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '0.6rem' }}>
                {BRAND_TONES.map((tone) => (
                  <div
                    key={tone.id}
                    onClick={() => setBrandTone(tone.id)}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '0.5rem',
                      border: brandTone === tone.id ? '2px solid var(--primary-600)' : '1px solid var(--border-light)',
                      background: brandTone === tone.id ? 'var(--primary-50)' : 'var(--bg-page)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: brandTone === tone.id ? 'var(--primary-800)' : 'var(--text-main)' }}>
                      {tone.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                      {tone.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                {t('settings.primaryLang')}
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {[
                  { id: 'en', label: 'English (Sri Lanka)' },
                  { id: 'si', label: 'Sinhala (සිංහල)' },
                  { id: 'ta', label: 'Tamil (தமிழ்)' },
                ].map((l) => (
                  <label
                    key={l.id}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: prefLang === l.id ? '1px solid var(--primary-600)' : '1px solid var(--border-light)',
                      background: prefLang === l.id ? 'var(--primary-50)' : 'white',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="prefLang"
                      checked={prefLang === l.id}
                      onChange={() => setPrefLang(l.id as any)}
                    />
                    <span>{l.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'var(--primary-600)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                marginTop: '0.5rem'
              }}
            >
              <Save size={16} />
              {saving ? t('common.loading') : t('settings.saveBtn')}
            </button>
          </form>
        </div>

        {/* Right Column: AI Architecture & Demo Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* AI Architecture Box */}
          <div style={{
            background: 'white',
            borderRadius: '0.875rem',
            border: '1px solid var(--border-light)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '0.5rem',
                background: '#faf5ff', color: '#9333ea',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sparkles size={19} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {t('settings.aiArchitecture')}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Google Cloud AI Builder Cup 2026
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Foundational LLM</span>
                <strong>Google Gemini 3.8 / 3.5 Flash</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Output Format</span>
                <strong>Structured JSON (Zod Validated)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sinhala / Tamil Localization</span>
                <strong>Unicode UTF-8 + Cultural Sensitivity Filter</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Operational Mode</span>
                <span style={{ color: 'var(--primary-600)', fontWeight: 700 }}>Dual-Engine (API + Offline Fallback)</span>
              </div>
            </div>

            <div style={{
              marginTop: '1.25rem',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              background: 'var(--primary-50)',
              border: '1px solid var(--primary-200)',
              fontSize: '0.75rem',
              color: 'var(--primary-800)',
              lineHeight: 1.4
            }}>
              ✓ Designed for micro, small, and medium retailers across Sri Lanka. Works completely with zero lock-in and graceful offline execution.
            </div>
          </div>

          {/* Catalog & Demo Seeder Box */}
          <div style={{
            background: 'white',
            borderRadius: '0.875rem',
            border: '1px solid var(--border-light)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '0.5rem',
                background: '#eff6ff', color: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Database size={19} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {t('settings.demoControls')}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Pre-load realistic Sri Lankan retail data for testing & demonstrations
                </p>
              </div>
            </div>

            {demoMessage && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '0.375rem',
                background: demoMessage.includes('Successfully') ? '#dcfce7' : '#fef2f2',
                color: demoMessage.includes('Successfully') ? '#15803d' : '#b91c1c',
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                {demoMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleSeedDemo}
                disabled={demoLoading}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-medium)',
                  background: 'white',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: demoLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={14} style={{ animation: demoLoading ? 'spin 0.8s linear infinite' : 'none' }} />
                <span>{t('settings.seedBtn')}</span>
              </button>

              <button
                type="button"
                onClick={handleClearDemo}
                disabled={demoLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: demoLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <Trash2 size={14} />
                <span>{t('settings.clearBtn')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── About & Limitations Card ─────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
          border: '1px solid #fde047',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginTop: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#92400e', margin: 0 }}>
              About GrowthOS — Limitations & Disclaimer
            </h3>
          </div>
          <ul style={{
            margin: 0, paddingLeft: '1.25rem',
            display: 'grid', gap: '0.6rem',
            fontSize: '0.85rem', color: '#78350f', lineHeight: 1.6,
          }}>
            <li>
              <strong>Native language review required:</strong> AI-generated Sinhala and Tamil captions may contain errors. A native speaker must review content marked with "Review" before publishing.
            </li>
            <li>
              <strong>Festival dates must be confirmed:</strong> Festival dates in the calendar are unconfirmed estimates. You must confirm the actual date in the Festivals section before GrowthOS can calculate countdowns or boost scores.
            </li>
            <li>
              <strong>Demo data is simulated:</strong> The sample products, sales records, and campaign data loaded by "Load Demo Data" are for demonstration only and do not reflect real sales or business performance.
            </li>
            <li>
              <strong>No sales or ranking guarantees:</strong> GrowthOS provides marketing suggestions and priority scores based on available data. It does not guarantee any increase in sales, revenue, or search ranking.
            </li>
            <li>
              <strong>No auto-posting or spending:</strong> GrowthOS does not automatically post to social media or spend any advertising budget on your behalf. All actions must be manually reviewed and executed by you.
            </li>
          </ul>
          <p style={{ marginTop: '0.875rem', marginBottom: 0, fontSize: '0.75rem', color: '#92400e', fontStyle: 'italic' }}>
            GrowthOS v1.0 — Built for Sri Lankan small & medium retailers. Powered by Google Gemini AI.
          </p>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
