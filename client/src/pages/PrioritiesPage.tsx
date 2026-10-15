import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Megaphone,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  fetchPriorities,
  generatePriorities,
  PriorityItem,
} from '../services/api';
import EmptyState from '../components/EmptyState';
import DemoBadge from '../components/DemoBadge';
import { useI18n } from '../context/I18nContext';

export const PrioritiesPage: React.FC = () => {
  const { t } = useI18n();
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PROMOTE_MORE' | 'MAINTAIN' | 'REDUCE'>('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const navigate = useNavigate();


  const loadPriorities = async () => {
    setLoading(true);
    try {
      const res = await fetchPriorities();
      if (res.success && res.priorities) {
        setPriorities(res.priorities);
      }
    } catch (err: any) {
      console.error('Failed to load priorities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPriorities();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generatePriorities();
      if (res.success) {
        showNotification(res.message || 'Priority scores successfully computed!');
        setPriorities(res.priorities);
      } else {
        showNotification(res.error || 'Failed to generate priorities', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Metrics summary
  const promoteCount = priorities.filter((p) => p.priority === 'PROMOTE_MORE').length;
  const maintainCount = priorities.filter((p) => p.priority === 'MAINTAIN').length;
  const reduceCount = priorities.filter((p) => p.priority === 'REDUCE').length;

  const filteredPriorities = priorities.filter((p) => {
    if (selectedFilter === 'ALL') return true;
    return p.priority === selectedFilter;
  });

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>✨</span>
            <h1 className="title-hero">{t('priorities.title')}</h1>
          </div>
          <p className="subtitle-hero">
            {t('priorities.subtitle')}
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn btn-primary"
          style={{ minWidth: '180px' }}
        >
          <RefreshCw size={16} className={isGenerating ? 'spin' : ''} />
          <span>{isGenerating ? t('common.loading') : t('priorities.rescoreBtn')}</span>
        </button>
      </div>


      {/* 3 Metric Summary Cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div
          className="card"
          style={{
            borderLeft: '4px solid #059669',
            cursor: 'pointer',
            backgroundColor: selectedFilter === 'PROMOTE_MORE' ? 'var(--primary-50)' : '#ffffff',
          }}
          onClick={() => setSelectedFilter(selectedFilter === 'PROMOTE_MORE' ? 'ALL' : 'PROMOTE_MORE')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              PROMOTE MORE
            </span>
            <span className="badge badge-green">High Priority</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#065f46', marginTop: '0.5rem' }}>
            {promoteCount}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            High margin, healthy stock, or surging festival demand
          </p>
        </div>

        <div
          className="card"
          style={{
            borderLeft: '4px solid #3b82f6',
            cursor: 'pointer',
            backgroundColor: selectedFilter === 'MAINTAIN' ? '#eff6ff' : '#ffffff',
          }}
          onClick={() => setSelectedFilter(selectedFilter === 'MAINTAIN' ? 'ALL' : 'MAINTAIN')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              MAINTAIN
            </span>
            <span className="badge badge-blue">Steady</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e40af', marginTop: '0.5rem' }}>
            {maintainCount}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Reliable everyday sellers with consistent repeat sales
          </p>
        </div>

        <div
          className="card"
          style={{
            borderLeft: '4px solid #f59e0b',
            cursor: 'pointer',
            backgroundColor: selectedFilter === 'REDUCE' ? '#fef3c7' : '#ffffff',
          }}
          onClick={() => setSelectedFilter(selectedFilter === 'REDUCE' ? 'ALL' : 'REDUCE')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              REDUCE / RESTOCK
            </span>
            <span className="badge badge-gold">Action Needed</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#92400e', marginTop: '0.5rem' }}>
            {reduceCount}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Out-of-stock items, slow dead inventory, or slim margins
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['ALL', 'PROMOTE_MORE', 'MAINTAIN', 'REDUCE'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            style={{
              padding: '0.375rem 0.875rem',
              fontSize: '0.8125rem',
              fontWeight: selectedFilter === filter ? 700 : 500,
              borderRadius: '0.5rem',
              border: '1px solid',
              borderColor: selectedFilter === filter ? 'var(--primary-600)' : 'var(--border-medium)',
              backgroundColor: selectedFilter === filter ? 'var(--primary-600)' : '#ffffff',
              color: selectedFilter === filter ? '#ffffff' : 'var(--text-main)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {filter === 'ALL'
              ? `All Products (${priorities.length})`
              : filter === 'PROMOTE_MORE'
              ? `Promote More (${promoteCount})`
              : filter === 'MAINTAIN'
              ? `Maintain (${maintainCount})`
              : `Reduce (${reduceCount})`}
          </button>
        ))}
      </div>

      {/* Main List */}
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
          Loading priority rankings...
        </div>
      ) : filteredPriorities.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={28} />}
          title="No priority scores calculated yet"
          description="Click 'Recalculate Scores' to evaluate your product catalog against margins, sales velocity, and upcoming Sri Lankan festivals."
          actionText="Compute Priority Scores"
          onAction={handleGenerate}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredPriorities.map((item, idx) => {
            const scoreNum = Math.round(Number(item.score));
            const isPromote = item.priority === 'PROMOTE_MORE';
            const isMaintain = item.priority === 'MAINTAIN';
            const reasonsList: string[] = Array.isArray(item.reasons)
              ? item.reasons
              : typeof item.reasons === 'string'
              ? JSON.parse(item.reasons)
              : [];

            let festBoostData: any = null;
            if (item.festival_boost) {
              festBoostData =
                typeof item.festival_boost === 'string'
                  ? JSON.parse(item.festival_boost)
                  : item.festival_boost;
            }

            return (
              <div
                key={item.product_id}
                className="card"
                style={{
                  borderLeft: `5px solid ${isPromote ? '#059669' : isMaintain ? '#3b82f6' : '#f59e0b'}`,
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Left: Product Info & Score */}
                  <div style={{ flex: '1 1 min(260px, 100%)', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 800,
                          color: 'var(--text-muted)',
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {item.product_name}
                      </h3>
                      {item.is_demo && <DemoBadge />}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <span
                        className={`badge ${
                          isPromote ? 'badge-green' : isMaintain ? 'badge-blue' : 'badge-gold'
                        }`}
                        style={{ fontWeight: 800 }}
                      >
                        {item.priority.replace('_', ' ')}
                      </span>

                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Rs. {Number(item.price_lkr).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>

                      {item.cost_lkr && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', backgroundColor: 'var(--primary-50)', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>
                          Margin: {Math.round(((Number(item.price_lkr) - Number(item.cost_lkr)) / Number(item.price_lkr)) * 100)}%
                        </span>
                      )}

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Stock: <strong>{item.stock_qty}</strong>
                      </span>

                      {festBoostData && festBoostData.applied && (
                        <span className="badge badge-gold">
                          <Calendar size={12} /> {festBoostData.festival_name} (+{festBoostData.boost_points} pts)
                        </span>
                      )}
                    </div>

                    {/* AI Commercial Reasons */}
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--border-light)',
                        borderRadius: '0.75rem',
                        padding: '0.875rem 1rem',
                        marginTop: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-800)', marginBottom: '0.5rem' }}>
                        <Sparkles size={14} color="#059669" />
                        <span>GrowthOS Commercial Intelligence:</span>
                      </div>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {reasonsList.map((reason, rIdx) => {
                          const isAction = reason.toLowerCase().startsWith('action:');
                          return (
                            <li
                              key={rIdx}
                              style={{
                                fontSize: '0.8125rem',
                                color: isAction ? '#047857' : 'var(--text-main)',
                                fontWeight: isAction ? 700 : 400,
                              }}
                            >
                              {reason}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {/* Right: Score Gauge & Launch Campaign */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minWidth: '180px' }}>
                    <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        GROWTH SCORE
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '2.25rem', fontWeight: 900, color: isPromote ? '#059669' : isMaintain ? '#2563eb' : '#d97706', lineHeight: 1 }}>
                          {scoreNum}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
                          / 100
                        </span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div
                        style={{
                          width: '140px',
                          height: '6px',
                          backgroundColor: 'var(--border-light)',
                          borderRadius: '9999px',
                          overflow: 'hidden',
                          marginTop: '0.375rem',
                        }}
                      >
                        <div
                          style={{
                            width: `${scoreNum}%`,
                            height: '100%',
                            backgroundColor: isPromote ? '#059669' : isMaintain ? '#3b82f6' : '#f59e0b',
                            borderRadius: '9999px',
                          }}
                        />
                      </div>
                    </div>

                    {isPromote && (
                      <button
                        onClick={() => navigate(`/campaigns/new?productId=${item.product_id}`)}
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%' }}
                      >
                        <Megaphone size={14} />
                        <span>Launch Campaign</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PrioritiesPage;
