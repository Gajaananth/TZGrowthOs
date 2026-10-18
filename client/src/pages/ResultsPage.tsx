import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, RefreshCw, TrendingUp, Package, CheckCircle2,
  Clock, AlertTriangle, Sparkles, MessageSquareQuote,
  Search, ArrowRight, ShieldCheck, DollarSign, Zap, Cpu, Layers, Activity
} from 'lucide-react';
import { fetchInsightsSummary, InsightsSummary } from '../services/api';
import { useI18n } from '../context/I18nContext';
import { TokenTelemetryModal } from '../components/TokenTelemetryModal';

const formatLKR = (val: number) => {
  return 'LKR ' + (val || 0).toLocaleString('en-LK', { maximumFractionDigits: 0 });
};

export const ResultsPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState<InsightsSummary | null>(() => {
    try {
      const cached = sessionStorage.getItem('tz_insights_summary');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState<boolean>(() => !sessionStorage.getItem('tz_insights_summary'));
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenModalOpen, setTokenModalOpen] = useState<boolean>(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh || data) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetchInsightsSummary();
      if (res.success && res.summary) {
        setData(res.summary);
        try {
          sessionStorage.setItem('tz_insights_summary', JSON.stringify(res.summary));
        } catch { /* ignore */ }
      } else {
        if (!data) setError(res.error || 'Failed to load insights summary');
      }
    } catch (err: any) {
      if (!data) setError(err.message || 'Error connecting to analytics service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{
          width: 44, height: 44,
          border: '3px solid var(--border-light)',
          borderTopColor: 'var(--primary-600)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '1rem'
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
          Synthesizing retail metrics & AI performance...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const catalog = data?.catalog || { totalProducts: 0, totalStockUnits: 0, catalogValueLkr: 0, outOfStockCount: 0, lowStockCount: 0 };
  const campaigns = data?.campaigns || { total: 0, approved: 0, inReview: 0, draft: 0, rejected: 0 };
  const ai = data?.ai || { totalCallsLast30Days: 0, featureBreakdown: {} };
  const priorities = data?.priorities?.distribution || {};
  const recentApproved = data?.recentApproved || [];
  const business = data?.business;

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <h1 className="title-hero" style={{ margin: 0 }}>📊 {t('results.title')}</h1>
            {business?.name && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                background: 'var(--primary-50)',
                color: 'var(--primary-700)',
                border: '1px solid var(--primary-200)'
              }}>
                {business.name} {business.city ? `• ${business.city}` : ''}
              </span>
            )}
          </div>
          <p className="subtitle-hero" style={{ margin: 0 }}>
            {t('results.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-medium)',
              background: 'white',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? t('common.loading') : t('common.refresh')}
          </button>
          <button
            onClick={() => navigate('/campaigns/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'var(--primary-600)',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
            }}
          >
            <Sparkles size={15} />
            {t('campaigns.newCampaign')}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          borderRadius: '0.75rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Card 1: Catalog Value */}
        <div style={{
          background: 'white',
          padding: '1.4rem',
          borderRadius: '0.875rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('results.inventoryValuation')}
              </p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem' }}>
                {formatLKR(Number(catalog.catalogValueLkr))}
              </h3>
            </div>
            <div style={{
              width: 42, height: 42, borderRadius: '0.625rem',
              background: 'var(--primary-50)', color: 'var(--primary-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <DollarSign size={22} />
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Across <strong>{catalog.totalStockUnits}</strong> units in {catalog.totalProducts} registered products
          </p>
        </div>

        {/* Card 2: Approved Campaigns */}
        <div style={{
          background: 'white',
          padding: '1.4rem',
          borderRadius: '0.875rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('results.campaignsActive')}
              </p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem' }}>
                {campaigns.approved} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {campaigns.total} total</span>
              </h3>
            </div>
            <div style={{
              width: 42, height: 42, borderRadius: '0.625rem',
              background: 'var(--accent-blue-light)', color: 'var(--accent-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span><strong>{campaigns.inReview}</strong> {t('campaigns.inReview')}</span>
            <span>•</span>
            <span><strong>{campaigns.draft}</strong> {t('campaigns.draft')}</span>
          </div>
        </div>

        {/* Card 3: AI & Token Activity */}
        <div style={{
          background: 'white',
          padding: '1.4rem',
          borderRadius: '0.875rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Gemini AI Tokens
              </p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem' }}>
                {(ai.totalTokens || 0).toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--primary-600)', fontWeight: 600 }}>Tokens</span>
              </h3>
            </div>
            <div style={{
              width: 42, height: 42, borderRadius: '0.625rem',
              background: '#f0fdf4', color: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>{ai.totalCallsLast30Days} runs • {ai.avgLatencyMs || 0}ms avg</span>
            <button
              onClick={() => setTokenModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-700)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.75rem',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              Telemetry →
            </button>
          </div>
        </div>

        {/* Card 4: Inventory Health */}
        <div style={{
          background: 'white',
          padding: '1.4rem',
          borderRadius: '0.875rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('results.stockAttention')}
              </p>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: (catalog.outOfStockCount + catalog.lowStockCount) > 0 ? '#dc2626' : 'var(--primary-600)',
                marginTop: '0.35rem'
              }}>
                {catalog.outOfStockCount + catalog.lowStockCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>items</span>
              </h3>
            </div>

            <div style={{
              width: 42, height: 42, borderRadius: '0.625rem',
              background: (catalog.outOfStockCount + catalog.lowStockCount) > 0 ? '#fef2f2' : 'var(--primary-50)',
              color: (catalog.outOfStockCount + catalog.lowStockCount) > 0 ? '#dc2626' : 'var(--primary-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span style={{ color: catalog.outOfStockCount > 0 ? '#dc2626' : 'inherit' }}>
              <strong>{catalog.outOfStockCount}</strong> out of stock
            </span>
            <span>•</span>
            <span style={{ color: catalog.lowStockCount > 0 ? '#d97706' : 'inherit' }}>
              <strong>{catalog.lowStockCount}</strong> low stock (≤5)
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Analytics Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Funnel & Approval Health */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '0.875rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="var(--primary-600)" />
            Campaign Approval Pipeline
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Progress from draft conception through merchant approval to active dispatch
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Approved & Active', count: campaigns.approved, total: campaigns.total, color: 'var(--primary-500)', bg: 'var(--primary-50)' },
              { label: 'Pending Merchant Review', count: campaigns.inReview, total: campaigns.total, color: 'var(--accent-gold)', bg: 'var(--accent-gold-light)' },
              { label: 'In Draft Creation', count: campaigns.draft, total: campaigns.total, color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' },
              { label: 'Rejected / Archived', count: campaigns.rejected, total: campaigns.total, color: '#94a3b8', bg: '#f1f5f9' },
            ].map((step) => {
              const pct = campaigns.total > 0 ? Math.round((step.count / campaigns.total) * 100) : 0;
              return (
                <div key={step.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{step.label}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{step.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: step.color,
                      borderRadius: '9999px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: '1.75rem',
            padding: '0.85rem',
            borderRadius: '0.625rem',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
              <ShieldCheck size={18} color="var(--primary-600)" />
              <span><strong>Sri Lanka Native Review:</strong> {data?.assets?.confirmed || 0} assets reviewed</span>
            </div>
            <button
              onClick={() => navigate('/campaigns')}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--primary-600)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              Review Queue <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Priority Engine Distribution */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '0.875rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} color="var(--accent-blue)" />
            Priority Engine Distribution
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            AI scoring distribution determining what products require marketing velocity
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '0.85rem' }}>
            {[
              {
                tier: 'P1: Urgent Clearance',
                count: priorities['P1'] || 0,
                desc: 'Overstocked or slow turnaround',
                badge: '#fee2e2',
                badgeColor: '#b91c1c'
              },
              {
                tier: 'P2: Festival Surge',
                count: priorities['P2'] || 0,
                desc: 'Aligned with upcoming calendar events',
                badge: '#fef3c7',
                badgeColor: '#b45309'
              },
              {
                tier: 'P3: High Margin Booster',
                count: priorities['P3'] || 0,
                desc: 'Maximum profitability margin',
                badge: '#dcfce7',
                badgeColor: '#15803d'
              },
              {
                tier: 'P4: Steady Everyday',
                count: priorities['P4'] || 0,
                desc: 'Regular reliable revenue drivers',
                badge: '#e0f2fe',
                badgeColor: '#0369a1'
              },
            ].map((p) => (
              <div key={p.tier} style={{
                padding: '0.95rem',
                borderRadius: '0.625rem',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-page)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '0.375rem',
                    background: p.badge,
                    color: p.badgeColor
                  }}>
                    {p.tier.split(':')[0]}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {p.count}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {p.tier.split(':')[1]}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {p.desc}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
            <button
              onClick={() => navigate('/priorities')}
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--primary-600)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              Explore all product priority scores <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Gemini AI & Token Telemetry Section ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        padding: 'clamp(1rem, 2.5vw, 1.75rem)',
        borderRadius: '0.875rem',
        border: '1px solid #bbf7d0',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '0.5rem',
              background: '#dcfce7', color: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#14532d' }}>
                  Gemini AI Engine & Token Telemetry
                </h2>
                <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                  gemini-3.8-flash
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#15803d', margin: '0.15rem 0 0' }}>
                Audited prompt & completion tokens consumed across store automation workflows
              </p>
            </div>
          </div>

          <button
            onClick={() => setTokenModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '0.5rem',
              border: '1px solid #86efac',
              background: '#ffffff',
              color: '#15803d',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Activity size={15} color="#16a34a" />
            Full Audit Log & Costs →
          </button>
        </div>

        {/* 3 Quick Token Benchmarks */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.85)', padding: '0.85rem 1rem', borderRadius: '0.625rem', border: '1px solid #dcfce7' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Total Consumed
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#14532d', marginTop: '0.2rem' }}>
              {(ai.totalTokens || 0).toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>tokens</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '0.2rem' }}>
              Prompt: {(ai.totalTokensIn || 0).toLocaleString()} • Output: {(ai.totalTokensOut || 0).toLocaleString()}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.85)', padding: '0.85rem 1rem', borderRadius: '0.625rem', border: '1px solid #dcfce7' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Inference Speed
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#14532d', marginTop: '0.2rem' }}>
              {ai.avgLatencyMs || 0} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>ms</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '0.2rem' }}>
              Sub-second response latency
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.85)', padding: '0.85rem 1rem', borderRadius: '0.625rem', border: '1px solid #dcfce7' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Total Generations
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#14532d', marginTop: '0.2rem' }}>
              {ai.totalCallsLast30Days} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>calls</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '0.2rem' }}>
              {ai.successfulCalls || ai.totalCallsLast30Days} successful runs
            </div>
          </div>
        </div>

        {/* Feature Breakdown Pills */}
        {Object.keys(ai.featureBreakdown || {}).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>Features used:</span>
            {Object.entries(ai.featureBreakdown).map(([feat, count]) => (
              <span
                key={feat}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  background: '#ffffff',
                  color: '#15803d',
                  border: '1px solid #bbf7d0'
                }}
              >
                {feat.replace(/_/g, ' ')}: <strong>{count} calls</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recent Approved Campaigns & Quick Growth Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
        gap: '1.5rem'
      }}>
        {/* Approved Campaigns */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '0.875rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} color="var(--primary-600)" />
              Recent Approved Campaigns
            </h2>
            <button
              onClick={() => navigate('/campaigns')}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--primary-600)',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              View All ({campaigns.total})
            </button>
          </div>

          {recentApproved.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              background: 'var(--bg-page)',
              borderRadius: '0.625rem',
              border: '1px dashed var(--border-medium)'
            }}>
              <Clock size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                No campaigns approved yet
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.85rem' }}>
                Draft a new campaign or review existing items in the Approval Hub.
              </p>
              <button
                onClick={() => navigate('/campaigns/new')}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.375rem',
                  background: 'var(--primary-600)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Create Campaign
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentApproved.map((camp: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '0.625rem',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      {camp.product_name || camp.name || 'Retail Campaign'}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>🎯 {camp.objective || 'Promote product'}</span>
                      {camp.platforms && camp.platforms.length > 0 && (
                        <>
                          <span>•</span>
                          <span>Channels: {Array.isArray(camp.platforms) ? camp.platforms.join(', ') : camp.platforms}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.6rem',
                    borderRadius: '9999px',
                    background: 'var(--primary-50)',
                    color: 'var(--primary-700)',
                    border: '1px solid var(--primary-200)',
                    flexShrink: 0
                  }}>
                    READY
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Growth Shortcuts */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '0.875rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
            🚀 Instant Growth Boosters
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Execute specialized retail growth workflows powered by Google Gemini
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div
              onClick={() => navigate('/seo')}
              style={{
                padding: '1rem',
                borderRadius: '0.625rem',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-page)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '0.5rem',
                  background: 'var(--accent-blue-light)', color: 'var(--accent-blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Search size={19} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    Local SEO & Google Maps Pack
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                    Rank higher for Colombo / Kandy / Galle local search queries
                  </p>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div
              onClick={() => navigate('/chat')}
              style={{
                padding: '1rem',
                borderRadius: '0.625rem',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-page)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '0.5rem',
                  background: 'var(--primary-50)', color: 'var(--primary-600)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MessageSquareQuote size={19} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    Ask GrowthOS AI Retail Strategist
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                    Interactive consulting grounded in your stock & calendar
                  </p>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            <div
              onClick={() => navigate('/festivals')}
              style={{
                padding: '1rem',
                borderRadius: '0.625rem',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-page)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '0.5rem',
                  background: '#fef3c7', color: '#b45309',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Package size={19} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    Sri Lankan Festival Calendar
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                    Align promotions with Sinhala & Tamil New Year, Vesak, Christmas
                  </p>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>

      <TokenTelemetryModal
        isOpen={tokenModalOpen}
        onClose={() => {
          setTokenModalOpen(false);
          loadData(true);
        }}
      />
    </div>
  );
};

export default ResultsPage;
