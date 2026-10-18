import React, { useState, useEffect } from 'react';
import {
  Zap, X, RefreshCw, Cpu, Activity, DollarSign,
  TrendingUp, CheckCircle2, AlertTriangle, Layers, Clock
} from 'lucide-react';
import { fetchTokenUsage, TokenUsageData } from '../services/api';
import { useI18n } from '../context/I18nContext';

interface TokenTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TokenTelemetryModal: React.FC<TokenTelemetryModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [data, setData] = useState<TokenUsageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetchTokenUsage();
      if (res.success && res.tokens) {
        setData(res.tokens);
      } else {
        setError(res.error || 'Failed to fetch token telemetry');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to token telemetry API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalTokens = data?.totalTokens || 0;
  const tokensIn = data?.totalTokensIn || 0;
  const tokensOut = data?.totalTokensOut || 0;
  const totalCalls = data?.totalCalls || 0;
  const successfulCalls = data?.successfulCalls || 0;
  const avgLatency = data?.avgLatencyMs || 0;
  const costLkr = data?.costLkr ?? 0;
  const costUsd = data?.costUsd ?? 0;

  const formatFeatureName = (feat: string) => {
    const map: Record<string, string> = {
      seo_multilingual_generation: 'SEO & Hashtag Pack',
      product_priorities: 'Inventory Scoring & Priority AI',
      campaign_generation: 'Marketing Campaign Writer',
      chat_strategist: 'Growth Copilot AI Chat',
      asset_regeneration: 'Asset Regeneration',
    };
    return map[feat] || feat.replace(/_/g, ' ');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0.75rem, 3vw, 1.5rem)',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--border-medium)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.625rem',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(52, 211, 153, 0.4)',
              }}
            >
              <Zap size={22} color="#34d399" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Gemini AI Token Telemetry
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(52, 211, 153, 0.25)',
                    color: '#a7f3d0',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                  }}
                >
                  {data?.model || 'gemini-3.8-flash'}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#a7f3d0' }}>
                Real-time API token consumption, latency benchmarks, and cost accounting
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Refresh token telemetry"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '0.5rem',
                padding: '0.45rem',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease',
              }}
            >
              <RefreshCw size={17} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '0.5rem',
                padding: '0.45rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* 4 Overview Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px, 100%), 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Card 1: Total Tokens */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '0.75rem',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  Total Tokens
                </span>
                <Zap size={16} color="#16a34a" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#14532d' }}>
                {totalTokens.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '0.25rem' }}>
                In: {tokensIn.toLocaleString()} • Out: {tokensOut.toLocaleString()}
              </div>
            </div>

            {/* Card 2: Estimated Cost */}
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '0.75rem',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                  Estimated Cost
                </span>
                <DollarSign size={16} color="#2563eb" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a' }}>
                LKR {costLkr.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#2563eb', marginTop: '0.25rem' }}>
                ${costUsd < 0.01 && costUsd > 0 ? costUsd.toFixed(4) : costUsd.toFixed(2)} USD
              </div>
            </div>

            {/* Card 3: Average Latency */}
            <div
              style={{
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: '0.75rem',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>
                  Avg Latency
                </span>
                <Clock size={16} color="#9333ea" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#581c87' }}>
                {avgLatency} ms
              </div>
              <div style={{ fontSize: '0.72rem', color: '#7e22ce', marginTop: '0.25rem' }}>
                Fast Gemini 3.8 Flash engine
              </div>
            </div>

            {/* Card 4: Total Executions */}
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '0.75rem',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
                  AI Invocations
                </span>
                <Activity size={16} color="#d97706" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f' }}>
                {totalCalls}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '0.25rem' }}>
                {totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 100}% Success rate
              </div>
            </div>
          </div>

          {/* Feature Breakdown Section */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={16} color="var(--primary-600)" />
              Token Usage by Retail Feature
            </h3>

            {(!data?.byFeature || data.byFeature.length === 0) ? (
              <div
                style={{
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  border: '1px dashed var(--border-medium)',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                No AI executions logged yet. Use the SEO Generator, Priorities AI, or Copilot Chat to record token telemetry!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.byFeature.map((item, i) => {
                  const itemTokens = Number(item.total_tokens) || 0;
                  const pct = totalTokens > 0 ? Math.round((itemTokens / totalTokens) * 100) : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '0.85rem 1rem',
                        background: '#f8fafc',
                        borderRadius: '0.625rem',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            {formatFeatureName(item.feature)}
                          </span>
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({item.calls || item.call_count || 0} calls • {item.avg_latency_ms || 0}ms avg)
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--primary-700)' }}>
                            {itemTokens.toLocaleString()} tokens
                          </span>
                          <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({pct}%)
                          </span>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div style={{ height: '6px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, var(--primary-500), var(--primary-600))',
                            borderRadius: '9999px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Runs Audit Log */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Cpu size={16} color="var(--primary-600)" />
              Recent AI Execution Audit Log
            </h3>

            {(!data?.recentRuns || data.recentRuns.length === 0) ? (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px dashed var(--border-medium)',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                No execution runs recorded yet.
              </div>
            ) : (
              <div className="table-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <table className="table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Feature</th>
                      <th>Model</th>
                      <th style={{ textAlign: 'right' }}>In</th>
                      <th style={{ textAlign: 'right' }}>Out</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Latency</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentRuns.map((run) => (
                      <tr key={run.id}>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                          {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatFeatureName(run.feature)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{run.model || 'gemini-3.8-flash'}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{(run.tokens_in || 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{(run.tokens_out || 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-700)' }}>
                          {(run.total_tokens || ((run.tokens_in || 0) + (run.tokens_out || 0))).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>{run.latency_ms}ms</td>
                        <td style={{ textAlign: 'center' }}>
                          {run.success ? (
                            <span className="badge badge-green" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                              <CheckCircle2 size={11} /> OK
                            </span>
                          ) : (
                            <span className="badge badge-rose" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                              <AlertTriangle size={11} /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafbfc',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Gemini 3.8 Flash is included in GrowthOS with ultra-fast sub-second latency.
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            {t('common.close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
