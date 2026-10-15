import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Package,
  Megaphone,
  Calendar,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Store,
} from 'lucide-react';
import { fetchGrowthPlan, GrowthPlan } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export const GrowthPlanPage: React.FC = () => {
  const { business } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<GrowthPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadPlan() {
      setLoading(true);
      try {
        const res = await fetchGrowthPlan();
        if (res.success && res.plan) {
          setPlan(res.plan);
        }
      } catch (err) {
        console.error('Failed to load growth plan:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, []);

  const toggleAction = (id: string) => {
    setCompletedActions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const topHero = plan?.topPromoteProducts?.[0];
  const approachingFestival = plan?.approachingFestivals?.[0];
  const lowestStockItem = plan?.inventoryAlerts?.[0];

  return (
    <div className="page-container">
      {/* Top Hero Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🌱</span>
          <h1 className="title-hero">{t('plan.title')}</h1>
        </div>
        <p className="subtitle-hero">
          {t('plan.subtitle')} <strong>{business?.name || 'Your Retail Store'}</strong> in {business?.city || 'Sri Lanka'}.
        </p>
      </div>

      {/* Quick Stats Ribbon */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {t('plan.activeProducts')}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            {plan?.totalProducts || 0}
          </div>
          <Link to="/products" style={{ fontSize: '0.75rem', color: 'var(--primary-700)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
            {t('plan.manageCatalog')} <ChevronRight size={12} />
          </Link>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {t('plan.catalogValue')}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#065f46', marginTop: '0.25rem' }}>
            Rs. {Number(plan?.totalCatalogValue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
            {t('plan.catalogValueSub')}
          </span>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {t('plan.highPriority')}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-700)', marginTop: '0.25rem' }}>
            {plan?.topPromoteProducts?.length || 0} items
          </div>
          <Link to="/priorities" style={{ fontSize: '0.75rem', color: 'var(--primary-700)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
            {t('plan.viewPriorities')} <ChevronRight size={12} />
          </Link>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {t('plan.upcomingFestivals')}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#92400e', marginTop: '0.25rem' }}>
            {plan?.approachingFestivals?.length || 0} active
          </div>
          <Link to="/festivals" style={{ fontSize: '0.75rem', color: '#92400e', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
            {t('plan.culturalCalendar')} <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* Main 2-Column Grid: Left (4 Questions Highlights) | Right (Action Checklist) */}
      <div className="growth-hero-grid">
        {/* Left Column: Key Question Highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Question 1: What to Promote Today? */}
          <div className="card" style={{ borderLeft: '5px solid #059669' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#065f46', fontSize: '0.875rem' }}>
                <Sparkles size={16} />
                <span>{t('plan.q1Title')}</span>
              </div>
              <span className="badge badge-green">{t('plan.q1Badge')}</span>
            </div>


            {topHero ? (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  {topHero.product_name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                    Rs. {Number(topHero.price_lkr).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="badge badge-green">
                    Growth Score: {Math.round(Number(topHero.score))}/100
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    In Stock: <strong>{topHero.stock_qty}</strong>
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
                  {Array.isArray(topHero.reasons) ? topHero.reasons[0] : 'High margin hero ready for promotional lift.'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => navigate(`/campaigns/new?productId=${topHero.product_id}`)}
                    className="btn btn-primary btn-sm"
                  >
                    <Megaphone size={14} /> {t('plan.createCampaignBtn')}
                  </button>
                  <Link to="/priorities" className="btn btn-secondary btn-sm">
                    {t('plan.viewPriorities')}
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Run priority calculation to see today's top product recommendation.
                </p>
                <Link to="/priorities" className="btn btn-primary btn-sm">
                  <Sparkles size={14} /> {t('priorities.rescoreBtn')}
                </Link>
              </div>
            )}
          </div>

          {/* Question 2 & 3: Cultural Festival Window */}
          <div className="card" style={{ borderLeft: '5px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#92400e', fontSize: '0.875rem' }}>
                <Calendar size={16} />
                <span>{t('plan.q2Title')}</span>
              </div>
              <span className="badge badge-gold">{t('plan.q2Badge')}</span>
            </div>

            {approachingFestival ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>
                    {approachingFestival.name_en}
                  </h3>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#b45309' }}>
                    In {approachingFestival.days_until} days
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Festive purchasing has begun for: <strong>{(approachingFestival.categories_boosted || []).join(', ')}</strong>.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to="/festivals" className="btn btn-secondary btn-sm">
                    {t('plan.culturalCalendar')}
                  </Link>
                  <Link to="/campaigns/new" className="btn btn-secondary btn-sm">
                    {t('plan.createCampaignBtn')}
                  </Link>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                No active festivals in the immediate 14-day window. View the full 2026 calendar in the <Link to="/festivals" style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{t('nav.festivals')}</Link>.
              </p>
            )}
          </div>

          {/* Stock Alert Highlight */}
          {lowestStockItem && (
            <div className="card" style={{ borderLeft: '5px solid #ef4444', backgroundColor: '#fffbfb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#b91c1c', fontWeight: 700, fontSize: '0.875rem' }}>
                <AlertTriangle size={16} />
                <span>{t('results.stockAttention')}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                <strong>{lowestStockItem.name}</strong> has only <strong>{lowestStockItem.stock_qty}</strong> units left.
              </p>
              <Link to="/products" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
                {t('plan.manageCatalog')}
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Question 4: What Should We Do Next? (Action Checklist) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary-800)', fontWeight: 800 }}>
            <TrendingUp size={18} />
            <span style={{ fontSize: '1rem' }}>{t('plan.q4Title')}</span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {t('plan.checklistSubtitle')}
          </p>


          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {plan?.nextActions?.map((act) => {
              const isChecked = !!completedActions[act.id];
              return (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.875rem',
                    borderRadius: '0.75rem',
                    backgroundColor: isChecked ? '#f0fdf4' : '#f8fafc',
                    border: '1px solid',
                    borderColor: isChecked ? '#bbf7d0' : 'var(--border-light)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <button
                    onClick={() => toggleAction(act.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      marginTop: '2px',
                      color: isChecked ? '#059669' : 'var(--border-medium)',
                    }}
                  >
                    <CheckCircle2 size={20} />
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                      <span className="badge badge-gray" style={{ fontSize: '0.625rem' }}>
                        {act.category}
                      </span>
                      <h4
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: isChecked ? '#065f46' : 'var(--text-main)',
                          textDecoration: isChecked ? 'line-through' : 'none',
                        }}
                      >
                        {act.title}
                      </h4>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {act.description}
                    </p>
                    <Link
                      to={act.actionUrl}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--primary-700)',
                        textDecoration: 'none',
                        marginTop: '0.375rem',
                      }}
                    >
                      Execute Action <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrowthPlanPage;
