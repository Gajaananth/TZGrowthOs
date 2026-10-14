import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  Sparkles,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import {
  fetchFestivals,
  confirmFestivalDate,
  updateFestival,
  Festival,
} from '../services/api';
import EmptyState from '../components/EmptyState';

export const FestivalsPage: React.FC = () => {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit / Confirm modal
  const [activeModalFestival, setActiveModalFestival] = useState<Festival | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalLeadDays, setModalLeadDays] = useState('14');

  const loadFestivals = async () => {
    setLoading(true);
    try {
      const res = await fetchFestivals();
      if (res.success && res.festivals) {
        setFestivals(res.festivals);
      }
    } catch (err: any) {
      console.error('Failed to load festivals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFestivals();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenConfirmModal = (fest: Festival) => {
    setActiveModalFestival(fest);
    setModalDate(fest.date ? fest.date.split('T')[0] : '');
    setModalLeadDays((fest.lead_days || 14).toString());
  };

  const handleSaveFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalFestival) return;

    try {
      const res = await confirmFestivalDate(activeModalFestival.id, modalDate);
      if (res.success) {
        showNotification(`Confirmed date for "${activeModalFestival.name_en}"`);
        setActiveModalFestival(null);
        loadFestivals();
      } else {
        showNotification(res.error || 'Failed to confirm date', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.875rem 1.25rem',
            borderRadius: '0.75rem',
            backgroundColor: notification.type === 'success' ? '#065f46' : '#991b1b',
            color: '#ffffff',
            boxShadow: 'var(--shadow-xl)',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.75rem' }}>📅</span>
          <h1 className="title-hero">Sri Lankan Cultural Festival Calendar</h1>
        </div>
        <p className="subtitle-hero">
          Sri Lankan holidays drive major retail purchasing cycles. Festival dates are never guessed by AI — you confirm exact dates and Nekath timings.
        </p>
      </div>

      {/* Info Banner */}
      <div
        className="card"
        style={{
          backgroundColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <Sparkles size={24} color="#059669" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.875rem', color: '#065f46' }}>
          <strong>Automated Festival Boost:</strong> Products in boosted categories automatically receive up to <strong>+30 priority points</strong> during the promotion window (14–21 days prior). Confirming exact holiday dates increases scoring accuracy.
        </div>
      </div>

      {/* Festivals Grid */}
      {loading ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--border-light)',
              borderTopColor: '#059669',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          Loading cultural calendar...
        </div>
      ) : festivals.length === 0 ? (
        <EmptyState
          icon={<Calendar size={28} />}
          title="No festivals found"
          description="Go to Products page and click 'Seed Demo Catalog' to populate the 2026 Sri Lankan cultural calendar."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {festivals.map((fest) => {
            let categoriesList: string[] = [];
            try {
              categoriesList =
                typeof fest.categories_boosted === 'string'
                  ? JSON.parse(fest.categories_boosted)
                  : fest.categories_boosted || [];
            } catch {
              categoriesList = [];
            }

            let rulesList: string[] = [];
            try {
              rulesList =
                typeof fest.sensitivity_rules === 'string'
                  ? JSON.parse(fest.sensitivity_rules)
                  : fest.sensitivity_rules || [];
            } catch {
              rulesList = [];
            }

            return (
              <div
                key={fest.id}
                className="card"
                style={{
                  borderLeft: `5px solid ${fest.date_confirmed ? '#059669' : '#f59e0b'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Left: Titles & Language Variations */}
                  <div style={{ flex: '1 1 380px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {fest.name_en}
                      </h2>
                      <span
                        className={`badge ${fest.date_confirmed ? 'badge-green' : 'badge-gold'}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        {fest.date_confirmed ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Date Confirmed</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={13} />
                            <span>Unconfirmed • Verification Required</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Sinhala and Tamil native labels */}
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      {fest.name_si && <span>සිංහල: <strong>{fest.name_si}</strong></span>}
                      {fest.name_ta && <span>தமிழ்: <strong>{fest.name_ta}</strong></span>}
                    </div>

                    {/* Boosted Categories */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                        Boosted Retail Categories:
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {categoriesList.map((cat, cIdx) => (
                          <span key={cIdx} className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Cultural Sensitivity Rules */}
                    {rulesList.length > 0 && (
                      <div
                        style={{
                          backgroundColor: '#fafbfc',
                          border: '1px solid var(--border-light)',
                          borderRadius: '0.5rem',
                          padding: '0.75rem 1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: '#92400e', marginBottom: '0.25rem' }}>
                          <ShieldAlert size={14} />
                          <span>Cultural Sensitivity & Brand Safety Rules:</span>
                        </div>
                        <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                          {rulesList.map((rule, rIdx) => (
                            <li key={rIdx}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right: Date, Countdown, & Action Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minWidth: '220px' }}>
                    <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'flex-end', color: 'var(--primary-700)', fontWeight: 700 }}>
                        <Clock size={16} />
                        <span>
                          {fest.days_until !== null && fest.days_until !== undefined
                            ? fest.days_until > 0
                              ? `In ${fest.days_until} days`
                              : fest.days_until === 0
                              ? 'Today!'
                              : `${Math.abs(fest.days_until)} days ago`
                            : 'Date not set'}
                        </span>
                      </div>

                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                        {fest.date ? new Date(fest.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unset'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        Promotion window: {fest.lead_days || 14} days ahead
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenConfirmModal(fest)}
                      className={fest.date_confirmed ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                      style={{ width: '100%' }}
                    >
                      {fest.date_confirmed ? (
                        <>
                          <Edit2 size={14} />
                          <span>Edit Date / Window</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Verify & Confirm Date</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CONFIRM / EDIT FESTIVAL MODAL ────────────────── */}
      {activeModalFestival && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1.25rem',
              width: '100%',
              maxWidth: '460px',
              padding: '2rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Confirm Festival Date</h2>
              <button
                onClick={() => setActiveModalFestival(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Confirm official date for <strong>{activeModalFestival.name_en}</strong>. GrowthOS will use this exact date to time automated priority promotions.
            </p>

            <form onSubmit={handleSaveFestival}>
              <div className="form-group">
                <label className="form-label">Official Festival Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Promotion Lead Time (Days Prior)</label>
                <input
                  type="number"
                  className="form-input"
                  value={modalLeadDays}
                  onChange={(e) => setModalLeadDays(e.target.value)}
                  min="3"
                  max="45"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  Recommended: 14 to 21 days for Sri Lankan holiday shopping.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setActiveModalFestival(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Confirm Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FestivalsPage;
