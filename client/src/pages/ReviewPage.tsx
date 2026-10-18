import React, { useCallback, useEffect, useState } from 'react';
import {
  Megaphone, Plus, CheckCircle, XCircle, RefreshCw, Clock,
  AlertTriangle, ChevronDown, ChevronUp, Sparkles, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  fetchCampaigns,
  fetchCampaign,
  approveCampaign,
  rejectCampaign,
  requestCampaignChanges,
  generateCampaignAssets,
  Campaign,
  CampaignStatus,
  ContentAsset,
  ApprovalEvent,
  SensitivityVerdict,
} from '../services/api';
import EmptyState from '../components/EmptyState';
import { useI18n } from '../context/I18nContext';


// ─── Spinner ──────────────────────────────────────────────────
const Spinner: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <>
    <style>{`@keyframes _spin2 { to { transform: rotate(360deg); } }`}</style>
    <div style={{
      width: size, height: size,
      border: '2px solid var(--border-light)',
      borderTopColor: 'var(--primary-600)',
      borderRadius: '50%',
      animation: '_spin2 0.7s linear infinite',
      flexShrink: 0,
    }} />
  </>
);

// ─── Status badge helpers ─────────────────────────────────────
function statusBadgeClass(status: CampaignStatus) {
  switch (status) {
    case 'APPROVED':  return 'badge-green';
    case 'IN_REVIEW': return 'badge-gold';
    case 'REJECTED':  return 'badge-rose';
    default:          return 'badge-gray';
  }
}
function statusIcon(status: CampaignStatus) {
  switch (status) {
    case 'APPROVED':  return <CheckCircle size={12} />;
    case 'IN_REVIEW': return <Clock size={12} />;
    case 'REJECTED':  return <XCircle size={12} />;
    default:          return <RefreshCw size={12} />;
  }
}
function statusLabel(status: CampaignStatus) {
  return status.replace('_', ' ');
}

// ─── Language label map ──────────────────────────────────────
const LANG_META: Record<string, { label: string; flag: string; font?: string }> = {
  en:       { label: 'English',  flag: '🇬🇧' },
  si:       { label: 'Sinhala',  flag: '🇱🇰', font: 'Noto Sans Sinhala' },
  ta:       { label: 'Tamil',    flag: '🇮🇳', font: 'Noto Sans Tamil' },
  singlish: { label: 'Singlish', flag: '🗣️' },
  tanglish: { label: 'Tanglish', flag: '💬' },
};

// ─── Language Tabs ────────────────────────────────────────────
const LanguageTabs: React.FC<{ assets: ContentAsset[]; campaignStatus: CampaignStatus }> = ({ assets, campaignStatus }) => {
  const captions = assets.filter(a => a.asset_type === 'CAPTION');
  const [active, setActive] = useState(captions[0]?.language || 'en');
  const activeHashtag = assets.find(a => a.asset_type === 'HASHTAGS' && a.language === active) || assets.find(a => a.asset_type === 'HASHTAGS');
  const hashtags = activeHashtag;
  const poster   = assets.find(a => a.asset_type === 'POSTER_CONCEPT');
  const imgPmpt  = assets.find(a => a.asset_type === 'IMAGE_PROMPT');
  const isApproved = campaignStatus === 'APPROVED';

  const handleDownloadCopyPack = () => {
    const lines: string[] = [
      `=== TRADIQ ZIUM GROWTHOS CAMPAIGN COPY PACK ===`,
      `Generated via Google Gemini AI`,
      `Date: ${new Date().toLocaleDateString()}`,
      `===============================================\n`,
    ];
    assets.forEach((a) => {
      lines.push(`--- [${a.asset_type}] Language: ${a.language} ---`);
      lines.push(a.body);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `campaign_copy_pack.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (captions.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No captions generated yet.</p>;


  return (
    <div>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
        {captions.map(a => {
          const meta = LANG_META[a.language] || { label: a.language, flag: '🌐' };
          const isActive = active === a.language;
          return (
            <button
              key={a.language}
              onClick={() => setActive(a.language)}
              style={{
                padding: '0.35rem 0.8rem', borderRadius: 999,
                border: isActive ? '2px solid var(--primary-600)' : '1px solid var(--border-medium)',
                background: isActive ? 'var(--primary-50)' : 'white',
                color: isActive ? 'var(--primary-700)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500, fontSize: '0.78rem',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}
            >
              {meta.flag} {meta.label}
              {a.needs_native_review && !a.is_confirmed && (
                <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '0 5px', fontSize: '0.6rem', fontWeight: 700 }}>
                  Review
                </span>
              )}
            </button>
          );
        })}
      </div>

      {captions.filter(a => a.language === active).map(a => {
        const meta = LANG_META[a.language] || {};
        const fullShareText = a.body + (activeHashtag ? '\n\n' + activeHashtag.body : '');
        return (
          <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{
              background: 'var(--bg-subtle)', borderRadius: '0.75rem', padding: '1rem',
              border: '1px solid var(--border-light)',
              fontFamily: meta.font ? `'${meta.font}', sans-serif` : 'inherit',
              fontSize: '0.875rem', lineHeight: 1.8, whiteSpace: 'pre-wrap',
            }}>
              {a.body}
            </div>

            {activeHashtag && (
              <div style={{
                background: 'white', borderRadius: '0.5rem', padding: '0.625rem 0.875rem',
                border: '1px solid var(--border-light)', fontSize: '0.78rem', color: 'var(--primary-700)',
                fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '0.5rem',
              }}>
                <span>{activeHashtag.body}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {meta.label || active} Tags
                </span>
              </div>
            )}

            {/* Quick Export & Share — APPROVED only */}
            {isApproved ? (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(fullShareText);
                    alert('Copied caption to clipboard!');
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.3rem 0.65rem', borderRadius: '0.375rem',
                    border: '1px solid var(--border-medium)', background: 'white',
                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer'
                  }}
                >
                  📋 Copy Caption
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(fullShareText)}`, '_blank');
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.3rem 0.65rem', borderRadius: '0.375rem',
                    border: 'none', background: '#25D366', color: 'white',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(37,211,102,0.3)'
                  }}
                >
                  💬 Share on WhatsApp
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.25rem', fontStyle: 'italic' }}>
                🔒 Copy & Share unlocks once Approved
              </div>
            )}
          </div>
        );
      })}

      {(hashtags || poster || imgPmpt) && (
        <div style={{ marginTop: '0.875rem', display: 'grid', gap: '0.75rem' }}>
          {hashtags && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.625rem', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1e40af', letterSpacing: '0.05em' }}>HASHTAGS</span>
                {isApproved && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(hashtags.body);
                      alert('Copied hashtags!');
                    }}
                    style={{ fontSize: '0.7rem', border: 'none', background: 'none', color: '#1e40af', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Copy
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>{hashtags.body}</div>
            </div>
          )}

          {poster && isApproved && (
            <div style={{
              background: 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
              border: '2px solid #86efac',
              borderRadius: '0.75rem',
              padding: '1rem',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#166534', letterSpacing: '0.05em' }}>
                  🎨 POSTER & BANNER CONCEPT (PRINT-READY)
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={handleDownloadCopyPack}
                    style={{
                      padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                      background: '#ffffff', color: '#166534', border: '1px solid #86efac',
                      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    📥 Copy Pack (.txt)
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                      background: '#16a34a', color: 'white', border: 'none',
                      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    🖶️ Print / Save PDF
                  </button>
                </div>
              </div>
              <div className="printable-poster" style={{
                background: 'white',
                border: '2px solid #166534',
                borderRadius: '0.5rem',
                padding: '1rem',
                fontFamily: "'Noto Sans Sinhala','Noto Sans Tamil',sans-serif",
                color: '#14532d',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                fontSize: '0.875rem',
                boxShadow: '0 2px 8px rgba(22,101,52,0.12)'
              }}>
                {poster.body}
              </div>
            </div>
          )}

          {imgPmpt && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.625rem', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9a3412', letterSpacing: '0.05em' }}>AI IMAGE GENERATION PROMPT (IMAGEN / MIDJOURNEY)</span>
                {isApproved && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(imgPmpt.body);
                      alert('Copied image prompt!');
                    }}
                    style={{ fontSize: '0.7rem', border: 'none', background: 'none', color: '#9a3412', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Copy
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#9a3412', fontStyle: 'italic' }}>{imgPmpt.body}</div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};


// ─── Audit Trail ─────────────────────────────────────────────
const ACTION_META: Record<string, { icon: React.ReactNode; color: string }> = {
  CREATED:           { icon: <Plus size={14} />,          color: '#6366f1' },
  GENERATED:         { icon: <Sparkles size={14} />,      color: 'var(--primary-600)' },
  APPROVED:          { icon: <CheckCircle size={14} />,   color: 'var(--primary-600)' },
  REJECTED:          { icon: <XCircle size={14} />,       color: '#e11d48' },
  CHANGES_REQUESTED: { icon: <RefreshCw size={14} />,     color: '#f59e0b' },
  ASSET_EDITED:      { icon: <RefreshCw size={14} />,     color: '#64748b' },
  NATIVE_CONFIRMED:  { icon: <CheckCircle size={14} />,   color: 'var(--primary-600)' },
};

const AuditTrail: React.FC<{ events: ApprovalEvent[] }> = ({ events }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
    {events.map(ev => {
      const meta = ACTION_META[ev.action] || { icon: <Clock size={14} />, color: '#64748b' };
      return (
        <div key={ev.id} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: `${meta.color}18`,
            color: meta.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 2,
          }}>
            {meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: meta.color }}>
                {ev.action.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                {new Date(ev.created_at).toLocaleString('en-LK')}
              </span>
            </div>
            {ev.note && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>{ev.note}</p>}
          </div>
        </div>
      );
    })}
  </div>
);

// ─── Campaign Card ────────────────────────────────────────────
interface CampaignCardProps {
  campaign: Campaign;
  onRefresh: () => void;
}
const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<{ assets: ContentAsset[]; events: ApprovalEvent[]; sensitivity?: SensitivityVerdict } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [confirmNote, setConfirmNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [generating, setGenerating] = useState(false);

  const platforms: string[] = (() => {
    try {
      return typeof campaign.platforms === 'string'
        ? JSON.parse(campaign.platforms)
        : campaign.platforms || [];
    } catch { return []; }
  })();

  const loadDetail = useCallback(async () => {
    if (detail) return;
    setLoadingDetail(true);
    try {
      const res = await fetchCampaign(campaign.id);
      if (res.success) {
        setDetail({ assets: res.assets, events: res.approvalEvents });
      }
    } finally {
      setLoadingDetail(false);
    }
  }, [campaign.id, detail]);

  const toggleExpand = () => {
    if (!expanded) loadDetail();
    setExpanded(prev => !prev);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg('');
    try {
      const res = await generateCampaignAssets(campaign.id);
      if (res.success) {
        setDetail({ assets: res.assets, events: detail?.events || [], sensitivity: res.sensitivity });
        onRefresh();
      } else {
        setErrorMsg(res.error || 'Generation failed');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading('approve');
    setErrorMsg('');
    try {
      const res = await approveCampaign(campaign.id, confirmNote || undefined);
      if (res.success) {
        onRefresh();
        setDetail(null); // force reload
        setExpanded(false);
      } else {
        setErrorMsg(res.error || 'Approval failed');
      }
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    setErrorMsg('');
    try {
      const res = await rejectCampaign(campaign.id, confirmNote || undefined);
      if (res.success) {
        onRefresh();
        setDetail(null);
        setExpanded(false);
      } else {
        setErrorMsg(res.error || 'Reject failed');
      }
    } finally {
      setActionLoading('');
    }
  };

  const handleRequestChanges = async () => {
    setActionLoading('changes');
    setErrorMsg('');
    try {
      const res = await requestCampaignChanges(campaign.id, confirmNote || undefined);
      if (res.success) {
        onRefresh();
        setDetail(null);
        setExpanded(false);
      } else {
        setErrorMsg(res.error || 'Failed');
      }
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div style={{
      border: '1px solid var(--border-light)',
      borderRadius: '1rem',
      background: 'white',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Card header row */}
      <div
        onClick={toggleExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1.125rem 1.25rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Product icon */}
        <div style={{
          width: 44, height: 44, borderRadius: '0.625rem',
          background: 'var(--primary-50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', flexShrink: 0,
        }}>
          📦
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              {campaign.product_name}
            </span>
            <span className={`badge ${statusBadgeClass(campaign.status)}`}>
              {statusIcon(campaign.status)} {statusLabel(campaign.status)}
            </span>
            {campaign.has_pending_native_review && (
              <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>⚠️ Native Review Needed</span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span>🎯 {campaign.objective}</span>
            {campaign.festival_name && <span>🎉 {campaign.festival_name}</span>}
            <span>📱 {platforms.join(', ')}</span>
            <span>{new Date(campaign.created_at).toLocaleDateString('en-LK')}</span>
          </div>
        </div>

        {/* Asset count */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-600)' }}>{campaign.asset_count || 0}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>ASSETS</div>
        </div>

        {/* Expand arrow */}
        <div style={{ color: 'var(--text-subtle)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-light)', padding: '1.25rem' }}>
          {loadingDetail ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
              <Spinner size={24} />
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {/* Generate CTA for DRAFT campaigns */}
              {campaign.status === 'DRAFT' && (
                <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: '0.875rem', padding: '1rem 1.25rem' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--primary-800)', marginBottom: '0.75rem' }}>
                    This campaign is in <strong>DRAFT</strong>. Generate 5-language assets to begin review.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={generating}
                    onClick={handleGenerate}
                  >
                    {generating ? <><Spinner size={14} /> Generating…</> : <><Sparkles size={14} /> Generate 5-Language Assets</>}
                  </button>
                </div>
              )}

              {/* Language captions */}
              {detail && detail.assets.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={16} color="var(--primary-600)" /> Content Previews
                  </div>
                  <LanguageTabs assets={detail.assets} campaignStatus={campaign.status} />
                </div>
              )}

              {/* Approval actions for IN_REVIEW */}
              {campaign.status === 'IN_REVIEW' && (
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>✅ Approval Decision</div>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Optional note for audit trail…"
                    value={confirmNote}
                    onChange={e => setConfirmNote(e.target.value)}
                    style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}
                  />
                  {errorMsg && (
                    <div style={{ color: '#e11d48', fontSize: '0.8rem', marginBottom: '0.5rem' }}>⚠️ {errorMsg}</div>
                  )}
                  <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!!actionLoading}
                      onClick={handleApprove}
                    >
                      {actionLoading === 'approve' ? <Spinner size={14} /> : <CheckCircle size={14} />}
                      Approve & Publish
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={!!actionLoading}
                      onClick={handleRequestChanges}
                    >
                      {actionLoading === 'changes' ? <Spinner size={14} /> : <RefreshCw size={14} />}
                      Request Changes
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={!!actionLoading}
                      onClick={handleReject}
                    >
                      {actionLoading === 'reject' ? <Spinner size={14} /> : <XCircle size={14} />}
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Regenerate for REJECTED / DRAFT after changes */}
              {(campaign.status === 'REJECTED') && (
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={generating}
                    onClick={handleGenerate}
                  >
                    {generating ? <><Spinner size={14} /> Regenerating…</> : <><Sparkles size={14} /> Regenerate Assets</>}
                  </button>
                </div>
              )}

              {/* Audit trail */}
              {detail && detail.events.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.625rem' }}>🕐 Audit Trail</div>
                  <AuditTrail events={detail.events} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Need Globe import in this file
const Globe = ({ size, color }: { size: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

// ─── Main ReviewPage ──────────────────────────────────────────
export const ReviewPage: React.FC = () => {
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const cached = sessionStorage.getItem('tz_campaigns');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('tz_campaigns'));
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | 'ALL'>('ALL');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetchCampaigns();
      if (res.success && res.campaigns) {
        setCampaigns(res.campaigns);
        try {
          sessionStorage.setItem('tz_campaigns', JSON.stringify(res.campaigns));
        } catch { /* ignore */ }
      } else {
        if (!campaigns.length) setError(res.error || 'Failed to load campaigns');
      }
    } catch (e: any) {
      if (!campaigns.length) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [campaigns.length]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus === 'ALL'
    ? campaigns
    : campaigns.filter(c => c.status === filterStatus);

  const counts: Record<string, number> = campaigns.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const STATUS_FILTERS: Array<{ value: CampaignStatus | 'ALL'; label: string }> = [
    { value: 'ALL',       label: `All (${campaigns.length})` },
    { value: 'DRAFT',     label: `${t('campaigns.draft')} (${counts.DRAFT || 0})` },
    { value: 'IN_REVIEW', label: `${t('campaigns.inReview')} (${counts.IN_REVIEW || 0})` },
    { value: 'APPROVED',  label: `${t('campaigns.approved')} (${counts.APPROVED || 0})` },
    { value: 'REJECTED',  label: `${t('campaigns.rejected')} (${counts.REJECTED || 0})` },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="title-hero">📢 {t('campaigns.title')}</h1>
          <p className="subtitle-hero">{t('campaigns.subtitle')}</p>
        </div>
        <Link to="/campaigns/new" className="btn btn-primary">
          <Plus size={16} /> {t('campaigns.newCampaign')}
        </Link>
      </div>


      {/* Stats row */}
      {campaigns.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total',     value: campaigns.length,             color: 'var(--primary-600)', bg: 'var(--primary-50)' },
            { label: 'In Review', value: counts.IN_REVIEW || 0,        color: '#92400e',            bg: '#fef3c7' },
            { label: 'Approved',  value: counts.APPROVED || 0,         color: 'var(--primary-700)', bg: 'var(--primary-100)' },
            { label: 'Draft',     value: counts.DRAFT || 0,            color: '#64748b',            bg: 'var(--bg-subtle)' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: stat.bg, borderRadius: '0.875rem',
              padding: '0.875rem 1rem', textAlign: 'center',
              border: '1px solid rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.125rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {campaigns.length > 0 && (
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              style={{
                padding: '0.4rem 0.875rem', borderRadius: 999,
                border: filterStatus === f.value ? '2px solid var(--primary-600)' : '1px solid var(--border-medium)',
                background: filterStatus === f.value ? 'var(--primary-50)' : 'white',
                color: filterStatus === f.value ? 'var(--primary-700)' : 'var(--text-muted)',
                fontWeight: filterStatus === f.value ? 700 : 500,
                fontSize: '0.8rem', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.875rem', padding: '1rem', color: '#9f1239', marginBottom: '1rem', fontSize: '0.875rem' }}>
          <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner size={32} />
        </div>
      )}

      {/* Empty state */}
      {!loading && campaigns.length === 0 && (
        <EmptyState
          icon={<Megaphone size={28} />}
          title="No campaigns yet"
          description="Create your first campaign to generate multi-language captions for Facebook, Instagram, TikTok and WhatsApp with built-in cultural safety review."
          actionText="Create First Campaign"
          onAction={() => window.location.href = '/campaigns/new'}
        />
      )}

      {/* Filtered empty */}
      {!loading && campaigns.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No campaigns match the <strong>{filterStatus}</strong> filter.
        </div>
      )}

      {/* Campaign cards */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {filtered.map(c => (
            <CampaignCard key={c.id} campaign={c} onRefresh={load} />
          ))}
        </div>
      )}

      {/* CTA if approved campaigns */}
      {counts.APPROVED > 0 && (
        <div style={{
          marginTop: '2rem',
          background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))',
          borderRadius: '1rem',
          padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          flexWrap: 'wrap',
          color: 'white',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>🎉 {counts.APPROVED} Campaign{counts.APPROVED > 1 ? 's' : ''} Approved!</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '0.2rem' }}>Track performance and measure ROI in the Results dashboard</div>
          </div>
          <Link to="/results" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            background: 'white', color: 'var(--primary-700)',
            padding: '0.6rem 1.25rem', borderRadius: '0.625rem',
            fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none',
          }}>
            View Results <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </div>
  );
};

export default ReviewPage;
