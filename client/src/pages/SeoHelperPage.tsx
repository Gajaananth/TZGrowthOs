import React, { useCallback, useEffect, useState } from 'react';
import {
  Search, Copy, CheckCircle, ChevronDown, ChevronUp,
  Package, Sparkles, Globe, MapPin, TrendingUp, Tag, Flame,
  Lightbulb, Compass, Share2, Zap
} from 'lucide-react';
import { fetchProducts, generateSeoPack, Product, SeoOutput, LanguagePack } from '../services/api';

// ─── Spinner ─────────────────────────────────────────────────
const Spinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <>
    <style>{`@keyframes _seo_spin { to { transform: rotate(360deg); } }`}</style>
    <div style={{
      width: size, height: size,
      border: '2px solid var(--border-light)',
      borderTopColor: 'var(--primary-600)',
      borderRadius: '50%',
      animation: '_seo_spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  </>
);

// ─── Copy-to-clipboard button ─────────────────────────────────
const CopyBtn: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
        border: '1px solid var(--border-light)', background: 'white',
        cursor: 'pointer', color: copied ? 'var(--primary-600)' : 'var(--text-muted)',
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s', flexShrink: 0,
      }}
    >
      {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : (label || 'Copy')}
    </button>
  );
};

// ─── Expandable section ───────────────────────────────────────
const Section: React.FC<{ title: string; icon: React.ReactNode; badge?: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title, icon, badge, children, defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: '0.875rem', overflow: 'hidden', background: 'white' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.875rem 1.125rem', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: 'var(--primary-600)' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>{title}</span>
        {badge && <span className="badge badge-blue">{badge}</span>}
        <span style={{ color: 'var(--text-subtle)' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      {open && <div style={{ padding: '0 1.125rem 1.125rem' }}>{children}</div>}
    </div>
  );
};

// ─── Copy field ───────────────────────────────────────────────
const CopyField: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div style={{ marginBottom: '0.875rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</label>
      <CopyBtn text={value} />
    </div>
    <div style={{
      background: 'var(--bg-subtle)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem',
      fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6, border: '1px solid var(--border-light)',
      fontFamily: mono ? 'monospace' : 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {value}
    </div>
  </div>
);

// ─── Language Meta Information ────────────────────────────────
const SEO_LANG_META: Record<string, { label: string; flag: string; badge: string; desc: string }> = {
  en: { label: 'English', flag: '🇬🇧', badge: 'Sri Lankan English', desc: 'Standard local commercial English with islandwide WhatsApp CTA' },
  si: { label: 'සිංහල', flag: '🇱🇰', badge: 'Sinhala Unicode', desc: 'Authentic Sinhala Unicode script for local search algorithms' },
  ta: { label: 'தமிழ்', flag: '🇱🇰', badge: 'Tamil Unicode', desc: 'Authentic Tamil Unicode script for Northern, Eastern & Colombo shoppers' },
  singlish: { label: 'Singlish', flag: '🇱🇰', badge: 'Colloquial Latin', desc: 'Sinhala written in English letters — highest search volume on mobile' },
  tanglish: { label: 'Tanglish', flag: '🇱🇰', badge: 'Colloquial Latin', desc: 'Tamil written in English letters — viral on Instagram & TikTok' },
};

// ─── Trend Badge Helper ───────────────────────────────────────
const renderTrendBadge = (badge: string) => {
  switch (badge) {
    case 'TRENDING_NOW':
      return <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.15rem 0.45rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>🔥 Trending Now</span>;
    case 'HIGH_VOLUME':
      return <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.15rem 0.45rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>📈 High Volume</span>;
    case 'LOCAL_INTENT':
      return <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.15rem 0.45rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>🎯 Local Buyer</span>;
    case 'SEASONAL_BOOST':
      return <span style={{ background: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff', padding: '0.15rem 0.45rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>🌟 Season Boost</span>;
    default:
      return <span style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', padding: '0.15rem 0.45rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>🔍 High Conversion</span>;
  }
};

const renderTagLevelBadge = (level: string) => {
  switch (level) {
    case 'MUST_USE':
      return <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.15rem 0.45rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 800 }}>⭐ Must Use</span>;
    case 'RECOMMENDED':
      return <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.15rem 0.45rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700 }}>👍 Recommended</span>;
    default:
      return <span style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '0.15rem 0.45rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 600 }}>🎯 Niche Target</span>;
  }
};

// ─── SEO Result Panel ─────────────────────────────────────────
const SeoResultPanel: React.FC<{ productName: string; seo: SeoOutput; aiMeta?: any }> = ({ productName, seo, aiMeta }) => {
  const [activeLang, setActiveLang] = useState<'en' | 'si' | 'ta' | 'singlish' | 'tanglish'>('en');

  // Fallback to active language pack or synthesize from base SEO
  const langPack: LanguagePack = seo.languages?.[activeLang] || {
    meta_title: seo.meta_title,
    meta_description: seo.meta_description,
    captions: seo.gmb_posts,
    keywords: seo.local_keywords.map(kw => ({
      keyword: kw,
      trend_badge: 'LOCAL_INTENT',
      trend_reason: 'High local search relevance in Sri Lanka',
    })),
    hashtags: [
      { tag: '#SriLanka', recommendation_level: 'MUST_USE', reason: 'High algorithmic discovery' },
      { tag: '#IslandwideDelivery', recommendation_level: 'MUST_USE', reason: 'Increases conversion by 35%' },
      { tag: '#LankaDeals', recommendation_level: 'RECOMMENDED', reason: 'Trending shopping tag' },
    ],
  };

  const allLangKeywords = langPack.keywords.map(k => k.keyword).join(', ');
  const allLangTags = langPack.hashtags.map(h => h.tag).join(' ');

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      
      {/* ─── Real-Time Token Telemetry Banner ─── */}
      {aiMeta && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.65rem 1.1rem',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '0.75rem',
          fontSize: '0.8rem',
          color: '#166534',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={16} color="#16a34a" />
            <span style={{ fontWeight: 700 }}>AI Token Consumption:</span>
            <strong style={{ color: '#14532d', fontSize: '0.88rem' }}>
              {(aiMeta.totalTokens || (aiMeta.tokensIn + aiMeta.tokensOut)).toLocaleString()} Tokens
            </strong>
            <span style={{ fontSize: '0.72rem', color: '#15803d' }}>
              (Input: {aiMeta.tokensIn || 0} • Output: {aiMeta.tokensOut || 0})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
            <span>⚡ Latency: <strong>{aiMeta.latencyMs}ms</strong></span>
            <span className="badge badge-green" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
              {aiMeta.model || 'gemini-3.8-flash'}
            </span>
          </div>
        </div>
      )}

      {/* ─── Trending & Timing Strategy Card ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
        color: '#ffffff',
        borderRadius: '1rem',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 8px 24px rgba(6, 78, 59, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Flame size={20} color="#f59e0b" />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a7f3d0' }}>
            Current Sri Lankan Market Trends & Recommendations
          </span>
        </div>
        <p style={{ fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 0.875rem 0', color: '#ecfdf5' }}>
          {seo.current_season_trend || 'High consumer demand in Sri Lanka for Cash on Delivery, instant WhatsApp catalog inquiries, and direct local merchant trust signals.'}
        </p>
        {seo.best_tags_advice && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '0.625rem',
            padding: '0.75rem 1rem',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.625rem',
          }}>
            <Lightbulb size={18} color="#fef08a" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#f0fdf4' }}>
              <strong>Best Tags Advice: </strong>{seo.best_tags_advice}
            </div>
          </div>
        )}
      </div>

      {/* ─── 5-Language Switcher Tabs ─── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '0.875rem',
        padding: '0.75rem 1rem',
        border: '1px solid var(--border-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Select Language Pack (5 Languages Supported)
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--primary-600)', fontWeight: 600 }}>
            {SEO_LANG_META[activeLang]?.desc}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['en', 'si', 'ta', 'singlish', 'tanglish'] as const).map(langKey => {
            const m = SEO_LANG_META[langKey];
            const isActive = activeLang === langKey;
            return (
              <button
                key={langKey}
                onClick={() => setActiveLang(langKey)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 999,
                  border: isActive ? '2px solid var(--primary-600)' : '1px solid var(--border-light)',
                  background: isActive ? 'var(--primary-50)' : '#f8fafc',
                  color: isActive ? 'var(--primary-700)' : 'var(--text-main)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 6px rgba(5, 150, 105, 0.15)' : 'none',
                }}
              >
                <span>{m.flag}</span>
                <span>{m.label}</span>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: 999,
                  background: isActive ? 'var(--primary-200)' : '#e2e8f0',
                  color: isActive ? 'var(--primary-800)' : '#64748b',
                  fontWeight: 700,
                }}>
                  {m.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Char Count Guide ─── */}
      <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: '0.75rem', padding: '0.75rem 1.125rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.8rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--primary-700)' }}>Meta title ({SEO_LANG_META[activeLang].label}): </span>
          <span style={{ color: langPack.meta_title.length <= 60 ? 'var(--primary-700)' : '#e11d48' }}>
            {langPack.meta_title.length} / 60 chars {langPack.meta_title.length <= 60 ? '✓' : '⚠️ Too long'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--primary-700)' }}>Meta description: </span>
          <span style={{ color: langPack.meta_description.length <= 155 ? 'var(--primary-700)' : '#e11d48' }}>
            {langPack.meta_description.length} / 155 chars {langPack.meta_description.length <= 155 ? '✓' : '⚠️ Too long'}
          </span>
        </div>
      </div>

      {/* ─── Local Search Meta Tags ─── */}
      <Section title={`Search Engine Meta Tags (${SEO_LANG_META[activeLang].label})`} icon={<Search size={16} />}>
        <CopyField label="Meta Title" value={langPack.meta_title} />
        <CopyField label="Meta Description" value={langPack.meta_description} />
      </Section>

      {/* ─── Recommended Trending Keywords ─── */}
      <Section
        title={`Recommended Keywords & Search Trends (${SEO_LANG_META[activeLang].label})`}
        icon={<TrendingUp size={16} />}
        badge={`${langPack.keywords.length} keywords`}
      >
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.875rem 0' }}>
          Ranked and categorized according to current shopper search behavior in Sri Lanka:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '0.625rem', marginBottom: '1rem' }}>
          {langPack.keywords.map((kw, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: '0.625rem',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  {kw.keyword}
                </span>
                <CopyBtn text={kw.keyword} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                {renderTrendBadge(kw.trend_badge)}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                💡 {kw.trend_reason}
              </p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <CopyBtn text={allLangKeywords} label="Copy All Keywords" />
        </div>
      </Section>

      {/* ─── Trending Hashtags & Social Tags ─── */}
      <Section
        title={`Suggested Hashtags & Social Discovery Tags (${SEO_LANG_META[activeLang].label})`}
        icon={<Tag size={16} />}
        badge={`${langPack.hashtags.length} tags`}
      >
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.875rem 0' }}>
          AI-recommended tags with effectiveness level based on current TikTok, Instagram, and Facebook retail algorithms:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: '0.625rem', marginBottom: '1rem' }}>
          {langPack.hashtags.map((h, i) => (
            <div
              key={i}
              style={{
                background: '#fafafa',
                border: '1px solid #e5e7eb',
                borderRadius: '0.625rem',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 800, color: 'var(--primary-700)', fontSize: '0.88rem' }}>
                  {h.tag}
                </span>
                {renderTagLevelBadge(h.recommendation_level)}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                {h.reason}
              </p>
            </div>
          ))}
        </div>
        <div style={{
          background: 'var(--bg-subtle)',
          borderRadius: '0.5rem',
          padding: '0.625rem 0.875rem',
          marginBottom: '0.75rem',
          border: '1px solid var(--border-light)',
          fontFamily: 'monospace',
          fontSize: '0.82rem',
          color: 'var(--primary-700)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <span>{allLangTags}</span>
          <CopyBtn text={allLangTags} label="Copy Tag Block" />
        </div>
      </Section>

      {/* ─── Ready-to-Post Captions ─── */}
      <Section title={`Ready-to-Post Social & GMB Captions (${SEO_LANG_META[activeLang].label})`} icon={<Share2 size={16} />}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {langPack.captions.map((caption, i) => {
            const fullPost = `${caption}\n\n${allLangTags}`;
            return (
              <div
                key={i}
                style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: '0.625rem',
                  padding: '0.875rem 1rem',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary-700)', textTransform: 'uppercase' }}>
                    Option {i + 1} • {SEO_LANG_META[activeLang].label}
                  </span>
                  <CopyBtn text={fullPost} label="Copy Caption + Tags" />
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                  {caption}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ─── Google My Business ─── */}
      <Section title="Google My Business Profile Card" icon={<MapPin size={16} />} defaultOpen={false}>
        <CopyField label="GMB Short Description" value={seo.gmb_description} />
      </Section>

      {/* ─── JSON-LD Schema Snippet ─── */}
      <Section title="JSON-LD Schema Snippet" icon={<span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{'{}'}</span>} defaultOpen={false}>
        <div style={{ position: 'relative' }}>
          <pre style={{
            background: '#1e293b', color: '#e2e8f0',
            borderRadius: '0.625rem', padding: '1rem', fontSize: '0.75rem',
            lineHeight: 1.6, overflow: 'auto', maxHeight: 240, margin: 0,
          }}>
            {seo.schema_snippet}
          </pre>
          <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
            <CopyBtn text={seo.schema_snippet} />
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Paste this inside a <code style={{ background: 'var(--bg-subtle)', padding: '0 4px', borderRadius: 4 }}>{`<script type="application/ld+json">`}</code> tag in your product page's <code style={{ background: 'var(--bg-subtle)', padding: '0 4px', borderRadius: 4 }}>{`<head>`}</code>.
        </p>
      </Section>

      {/* ─── Local SEO Tips ─── */}
      <Section title="Sri Lankan SEO Tips" icon={<Sparkles size={16} />} badge={`${seo.tips.length} tips`} defaultOpen={false}>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.625rem' }}>
          {seo.tips.map((tip, i) => (
            <li key={i} style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.6 }}>{tip}</li>
          ))}
        </ol>
      </Section>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────
export const SeoHelperPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = sessionStorage.getItem('tz_products');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [selectedId, setSelectedId] = useState(() => {
    try {
      const cached = sessionStorage.getItem('tz_products');
      const list = cached ? JSON.parse(cached) : [];
      return list[0]?.id || '';
    } catch { return ''; }
  });
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(() => !sessionStorage.getItem('tz_products'));
  const [result, setResult] = useState<{ productName: string; seo: SeoOutput; aiMeta?: any } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts().then(r => {
      if (r.products) {
        setProducts(r.products);
        try {
          sessionStorage.setItem('tz_products', JSON.stringify(r.products));
        } catch { /* ignore */ }
        if (r.products.length > 0 && !selectedId) {
          setSelectedId(r.products[0].id);
        }
      }
      setLoadingProducts(false);
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await generateSeoPack(selectedId);
      if (res.success) {
        setResult({ productName: res.product.name, seo: res.seo, aiMeta: res.aiMeta });
      } else {
        setError(res.error || 'Failed to generate SEO pack');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const selectedProduct = products.find(p => p.id === selectedId);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="title-hero">🔍 Local SEO & Trending Tags Engine</h1>
        <p className="subtitle-hero">
          Generate Google-optimized meta tags, trending hashtags, keywords, and captions in all 5 languages (English, Sinhala, Tamil, Singlish & Tanglish) with real-time Sri Lankan market timing intelligence.
        </p>
      </div>

      {/* Product selector */}
      <div className="card" style={{ marginBottom: '1.5rem', maxWidth: 750 }}>
        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.4rem' }}>
              <Package size={14} /> Select Product to Optimize
            </label>
            {loadingProducts ? (
              <div style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <Spinner size={14} /> Loading inventory products…
              </div>
            ) : (
              <select
                className="form-input"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {products.length === 0 && <option value="">No products found</option>}
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Rs. {parseFloat(p.price_lkr as any).toLocaleString()} ({p.category})
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading || !selectedId || loadingProducts}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', height: 42 }}
          >
            {loading ? (
              <>
                <Spinner size={16} /> Generating 5-Language Pack…
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate 5-Language SEO & Tags
              </>
            )}
          </button>
        </div>

        {selectedProduct && (
          <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Category: <strong style={{ color: 'var(--text-main)' }}>{selectedProduct.category}</strong></span>
            <span>Price: <strong style={{ color: 'var(--text-main)' }}>Rs. {parseFloat(selectedProduct.price_lkr as any).toLocaleString()}</strong></span>
            <span>Stock: <strong style={{ color: 'var(--text-main)' }}>{selectedProduct.stock_qty} units</strong></span>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.75rem',
          padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#be123c', fontSize: '0.875rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Result panel */}
      {result && (
        <SeoResultPanel productName={result.productName} seo={result.seo} aiMeta={result.aiMeta} />
      )}
    </div>
  );
};

export default SeoHelperPage;
