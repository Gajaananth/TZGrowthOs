import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle, AlertTriangle, Globe, Megaphone, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchProducts,
  fetchFestivals,
  createCampaign,
  generateCampaignAssets,
  Product,
  Festival,
  ContentAsset,
  SensitivityVerdict,
} from '../services/api';

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', emoji: '📘' },
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
];

const OBJECTIVES = [
  { id: 'awareness', label: 'Brand Awareness', desc: 'Reach new customers' },
  { id: 'sales', label: 'Drive Sales', desc: 'Promote product & price' },
  { id: 'clearance', label: 'Stock Clearance', desc: 'Sell excess inventory fast' },
  { id: 'festival', label: 'Festival Promotion', desc: 'Tie to upcoming festival' },
];

const LANG_LABELS: Record<string, { label: string; flag: string; font?: string }> = {
  en:       { label: 'English',   flag: '🇬🇧' },
  si:       { label: 'Sinhala',   flag: '🇱🇰', font: 'Noto Sans Sinhala' },
  ta:       { label: 'Tamil',     flag: '🇮🇳', font: 'Noto Sans Tamil' },
  singlish: { label: 'Singlish',  flag: '🗣️' },
  tanglish: { label: 'Tanglish',  flag: '💬' },
};

const STEP_LABELS = ['Choose Product', 'Campaign Setup', 'Review & Generate'];

// ─── Spinner ─────────────────────────────────────────────────────────────────
const Spinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <>
    <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
    <div style={{
      width: size, height: size,
      border: '2px solid var(--border-light)',
      borderTopColor: 'var(--primary-600)',
      borderRadius: '50%',
      animation: '_spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  </>
);

// ─── Step Indicator ───────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ step: number }> = ({ step }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2rem' }}>
    {STEP_LABELS.map((label, i) => {
      const done = i < step;
      const active = i === step;
      return (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: 'clamp(65px, 20vw, 90px)' }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: done ? 'var(--primary-600)' : active ? 'var(--primary-600)' : 'var(--border-light)',
              color: done || active ? 'white' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.8rem',
              transition: 'all 0.3s',
            }}>
              {done ? <CheckCircle size={16} /> : i + 1}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: active ? 700 : 500, color: active ? 'var(--primary-700)' : 'var(--text-muted)', textAlign: 'center' }}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div style={{
              flex: 1, height: 2, marginBottom: '1.1rem',
              background: i < step ? 'var(--primary-600)' : 'var(--border-light)',
              transition: 'background 0.4s',
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Language Tab Viewer ──────────────────────────────────────────────────────
const LanguageTabs: React.FC<{ assets: ContentAsset[] }> = ({ assets }) => {
  const captions = assets.filter(a => a.asset_type === 'CAPTION');
  const hashtags = assets.find(a => a.asset_type === 'HASHTAGS');
  const poster   = assets.find(a => a.asset_type === 'POSTER_CONCEPT');
  const imgPmpt  = assets.find(a => a.asset_type === 'IMAGE_PROMPT');

  const [activeTab, setActiveTab] = useState<string>(captions[0]?.language || 'en');

  return (
    <div>
      {/* Language Tabs */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {captions.map(asset => {
          const meta = LANG_LABELS[asset.language] || { label: asset.language, flag: '🌐' };
          const active = activeTab === asset.language;
          return (
            <button
              key={asset.language}
              onClick={() => setActiveTab(asset.language)}
              style={{
                padding: '0.4rem 0.875rem',
                borderRadius: 999,
                border: active ? '2px solid var(--primary-600)' : '1px solid var(--border-medium)',
                background: active ? 'var(--primary-50)' : 'white',
                color: active ? 'var(--primary-700)' : 'var(--text-muted)',
                fontWeight: active ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              {meta.flag} {meta.label}
              {asset.needs_native_review && !asset.is_confirmed && (
                <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '0 5px', fontSize: '0.65rem', fontWeight: 700 }}>
                  Review
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Caption Body */}
      {captions.filter(a => a.language === activeTab).map(asset => {
        const meta = LANG_LABELS[asset.language] || { label: asset.language, flag: '🌐' };
        return (
          <div key={asset.id} style={{
            background: 'var(--bg-subtle)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            fontFamily: meta.font ? `'${meta.font}', sans-serif` : 'inherit',
            fontSize: '0.9rem',
            lineHeight: 1.75,
            color: 'var(--text-main)',
            whiteSpace: 'pre-wrap',
            border: '1px solid var(--border-light)',
          }}>
            {asset.body}
          </div>
        );
      })}

      {/* Extra Assets */}
      {(hashtags || poster || imgPmpt) && (
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
          {hashtags && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.375rem', letterSpacing: '0.05em' }}>HASHTAGS</div>
              <div style={{ fontSize: '0.85rem', color: '#1e40af', lineHeight: 1.6 }}>{hashtags.body}</div>
            </div>
          )}
          {poster && (
            <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b21a8', marginBottom: '0.375rem', letterSpacing: '0.05em' }}>POSTER CONCEPT</div>
              <div style={{ fontSize: '0.85rem', color: '#6b21a8', lineHeight: 1.6 }}>{poster.body}</div>
            </div>
          )}
          {imgPmpt && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9a3412', marginBottom: '0.375rem', letterSpacing: '0.05em' }}>AI IMAGE PROMPT</div>
              <div style={{ fontSize: '0.85rem', color: '#9a3412', lineHeight: 1.6 }}>{imgPmpt.body}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Sensitivity Badge ─────────────────────────────────────────────────────
const SensitivityBadge: React.FC<{ verdict: SensitivityVerdict }> = ({ verdict }) => (
  <div style={{
    border: `1px solid ${verdict.passed ? 'var(--primary-200)' : '#fca5a5'}`,
    borderRadius: '0.875rem',
    padding: '1rem 1.25rem',
    background: verdict.passed ? 'var(--primary-50)' : '#fff1f2',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {verdict.passed
        ? <CheckCircle size={18} color="var(--primary-600)" />
        : <AlertTriangle size={18} color="#e11d48" />}
      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: verdict.passed ? 'var(--primary-700)' : '#9f1239' }}>
        Cultural Safety: {verdict.passed ? 'Passed ✓' : 'Flagged — Review Required'}
      </span>
    </div>
    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{verdict.overall_verdict}</p>
    {verdict.flags.length > 0 && (
      <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#9f1239' }}>
        {verdict.flags.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    )}
    {verdict.suggestions.length > 0 && (
      <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {verdict.suggestions.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    )}
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate();

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [festivals, setFestivals] = useState<Festival[]>([]);

  // Step state
  const [step, setStep] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedFestivalId, setSelectedFestivalId] = useState('');
  const [objective, setObjective] = useState('awareness');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram', 'whatsapp']);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<ContentAsset[]>([]);
  const [sensitivity, setSensitivity] = useState<SensitivityVerdict | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [campaignId, setCampaignId] = useState('');

  useEffect(() => {
    Promise.all([fetchProducts(), fetchFestivals()])
      .then(([pRes, fRes]) => {
        setProducts(pRes.products || []);
        setFestivals((fRes.festivals || []).filter(f => f.date));
      })
      .finally(() => setLoadingData(false));
  }, []);

  const togglePlatform = (pid: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg('');
    try {
      // Step 1: Create campaign
      const createRes = await createCampaign({
        product_id: selectedProductId,
        festival_id: selectedFestivalId || null,
        objective,
        platforms: selectedPlatforms,
      });
      if (!createRes.success) {
        setErrorMsg(createRes.error || 'Failed to create campaign');
        return;
      }
      const cid = createRes.campaign.id;
      setCampaignId(cid);

      // Step 2: Generate 5-language assets
      const genRes = await generateCampaignAssets(cid);
      if (!genRes.success) {
        setErrorMsg(genRes.error || 'Generation failed');
        return;
      }
      setGeneratedAssets(genRes.assets || []);
      setSensitivity(genRes.sensitivity || null);
      setStep(2);
    } catch (e: any) {
      setErrorMsg(e.message || 'Unexpected error');
    } finally {
      setGenerating(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  if (loadingData) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/campaigns" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-700)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          <ArrowLeft size={16} /> Back to Campaigns
        </Link>
        <h1 className="title-hero">✨ Create New Campaign</h1>
        <p className="subtitle-hero">Generate culturally-aware Sri Lankan retail copy in 5 language variations</p>
      </div>

      <StepIndicator step={step} />

      {/* ── STEP 0: Choose Product ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="card" style={{ maxWidth: 800 }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={20} color="var(--primary-600)" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Select a Product</h2>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{products.length} products</span>
          </div>

          {products.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No products found. <Link to="/products" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Add products first →</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.625rem', maxHeight: 440, overflowY: 'auto' }}>
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProductId(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.875rem 1rem',
                    borderRadius: '0.75rem',
                    border: selectedProductId === p.id ? '2px solid var(--primary-600)' : '1px solid var(--border-light)',
                    background: selectedProductId === p.id ? 'var(--primary-50)' : 'white',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '0.5rem',
                    background: 'var(--bg-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', flexShrink: 0,
                  }}>
                    📦
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.1rem' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {p.category} · Rs. {Number(p.price_lkr).toLocaleString()} · Stock: {p.stock_qty}
                    </div>
                  </div>
                  {p.current_priority === 'PROMOTE_MORE' && (
                    <span className="badge badge-green" style={{ fontSize: '0.7rem', flexShrink: 0 }}>⭐ Promote</span>
                  )}
                  {selectedProductId === p.id && (
                    <CheckCircle size={20} color="var(--primary-600)" style={{ flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              disabled={!selectedProductId}
              onClick={() => setStep(1)}
            >
              Next: Campaign Setup <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Campaign Setup ─────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 800 }}>
          {/* Selected Product Summary */}
          {selectedProduct && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'var(--primary-50)', border: '1px solid var(--primary-200)',
              borderRadius: '0.875rem', padding: '0.875rem 1.25rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>📦</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedProduct.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {selectedProduct.category} · Rs. {Number(selectedProduct.price_lkr).toLocaleString()}
                </div>
              </div>
              <button onClick={() => setStep(0)} style={{ marginLeft: 'auto', color: 'var(--primary-700)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                Change
              </button>
            </div>
          )}

          {/* Festival Tie-in */}
          <div className="card">
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">🎉 Festival Tie-in (optional)</label>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Link this campaign to an upcoming festival for culturally relevant copy</p>
            </div>
            <select
              className="form-select"
              value={selectedFestivalId}
              onChange={e => setSelectedFestivalId(e.target.value)}
            >
              <option value="">— No festival (general campaign) —</option>
              {festivals.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name_en}{f.days_until != null ? ` · ${f.days_until}d away` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Objective */}
          <div className="card">
            <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
              <Megaphone size={15} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
              Campaign Objective
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '0.625rem' }}>
              {OBJECTIVES.map(obj => (
                <button
                  key={obj.id}
                  onClick={() => setObjective(obj.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    border: objective === obj.id ? '2px solid var(--primary-600)' : '1px solid var(--border-light)',
                    background: objective === obj.id ? 'var(--primary-50)' : 'white',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: objective === obj.id ? 'var(--primary-700)' : 'var(--text-main)' }}>
                    {obj.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{obj.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div className="card">
            <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
              <Globe size={15} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
              Publish Platforms
            </label>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              {PLATFORMS.map(pl => {
                const active = selectedPlatforms.includes(pl.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => togglePlatform(pl.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: 999,
                      border: active ? '2px solid var(--primary-600)' : '1px solid var(--border-medium)',
                      background: active ? 'var(--primary-50)' : 'white',
                      color: active ? 'var(--primary-700)' : 'var(--text-muted)',
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {pl.emoji} {pl.label}
                  </button>
                );
              })}
            </div>
            {selectedPlatforms.length === 0 && (
              <p style={{ color: 'var(--accent-rose)', fontSize: '0.78rem', marginTop: '0.5rem' }}>Select at least one platform</p>
            )}
          </div>

          {errorMsg && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.75rem', padding: '0.875rem 1rem', color: '#9f1239', fontSize: '0.875rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(0)}>
              <ArrowLeft size={16} /> Back
            </button>
            <button
              className="btn btn-primary"
              disabled={selectedPlatforms.length === 0 || generating}
              onClick={handleGenerate}
              style={{ minWidth: 220 }}
            >
              {generating ? (
                <><Spinner size={16} /> Generating 5-Language Copy…</>
              ) : (
                <><Sparkles size={16} /> Generate Campaign Assets</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review Generated Assets ────────────────────────────────── */}
      {step === 2 && (
        <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 900 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
            borderRadius: '1rem', padding: '1.25rem 1.5rem', color: 'white',
          }}>
            <CheckCircle size={28} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>5-Language Assets Generated!</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>English · Sinhala · Tamil · Singlish · Tanglish — ready for review</div>
            </div>
          </div>

          {/* Cultural Sensitivity */}
          {sensitivity && <SensitivityBadge verdict={sensitivity} />}

          {/* Language Caption Tabs */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>📝 Content Previews</span>
              <span className="badge badge-blue">{generatedAssets.filter(a => a.asset_type === 'CAPTION').length} languages</span>
            </div>
            <LanguageTabs assets={generatedAssets} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/campaigns')}>
              Review Later
            </button>
            <Link to={`/campaigns`} className="btn btn-primary">
              <CheckCircle size={16} /> Go to Campaigns
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCampaignPage;
