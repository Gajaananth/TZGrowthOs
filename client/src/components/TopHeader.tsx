import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Menu, X, LayoutDashboard, Package, Sparkles, Megaphone,
  Search, BarChart3, MessageSquareQuote, Calendar, Settings,
  LogOut, Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import { TokenHeaderWidget } from './TokenHeaderWidget';

export const TopHeader: React.FC = () => {
  const { user, business, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const navItems = [
    { to: '/', label: t('nav.growthPlan'), icon: LayoutDashboard },
    { to: '/products', label: t('nav.products'), icon: Package },
    { to: '/priorities', label: t('nav.priorities'), icon: Sparkles },
    { to: '/campaigns', label: t('nav.campaigns'), icon: Megaphone },
    { to: '/seo', label: t('nav.seo'), icon: Search },
    { to: '/results', label: t('nav.results'), icon: BarChart3 },
    { to: '/chat', label: t('nav.chat'), icon: MessageSquareQuote },
    { to: '/festivals', label: t('nav.festivals'), icon: Calendar },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.625rem clamp(0.75rem, 3vw, 1.5rem)',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-light)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          width: '100%',
          minHeight: '54px',
        }}
      >
        {/* Left: Hamburger (mobile/tablet) + Logo + Store Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0, flex: 1 }}>
          {/* Mobile/Tablet Menu Toggle */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-light)',
              background: '#f8fafc',
              color: 'var(--text-main)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo & Brand Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <img
              src="/logo.png"
              alt="GrowthOS Logo"
              style={{
                width: 'clamp(1.5rem, 4vw, 1.85rem)',
                height: 'clamp(1.5rem, 4vw, 1.85rem)',
                objectFit: 'contain',
                borderRadius: '0.375rem',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
              <span style={{ fontWeight: 800, fontSize: 'clamp(0.85rem, 2.5vw, 1rem)', color: 'var(--primary-800)', letterSpacing: '-0.02em', flexShrink: 0 }}>
                GrowthOS
              </span>
              {business?.name && (
                <span
                  title={`${business.name} ${business.city ? `(${business.city})` : ''}`}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 'clamp(110px, 30vw, 260px)',
                  }}
                >
                  • {business.name} {business.city ? `(${business.city})` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Omnipresent Token Telemetry & Language Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.35rem, 1.5vw, 0.65rem)', flexShrink: 0 }}>
          <TokenHeaderWidget variant="pill" showLabel={true} />
          <LanguageSwitcher variant="pill" showLabel={true} />
        </div>
      </header>

      {/* ─── Mobile & Tablet Drawer Modal ─── */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Slide-out Menu Panel */}
          <div
            style={{
              position: 'relative',
              width: 'min(300px, 85vw)',
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 101,
              animation: 'drawerSlide 0.2s ease-out forwards',
            }}
          >
            <style>{`
              @keyframes drawerSlide {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
              }
            `}</style>

            {/* Drawer Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img src="/logo.png" alt="GrowthOS Logo" style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-800)', lineHeight: 1.1 }}>
                    GrowthOS
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Tradiq Zium Retail AI
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: '0.375rem',
                  padding: '0.35rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Business Badge */}
            {business && (
              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--primary-50)', borderBottom: '1px solid var(--primary-100)' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--primary-700)', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Active Business
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-900)', marginTop: '0.15rem' }}>
                  {business.name}
                </div>
                {business.city && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)' }}>
                    📍 {business.city}, Sri Lanka
                  </div>
                )}
              </div>
            )}

            {/* Token Telemetry Quick Access in Drawer */}
            <div style={{ padding: '0.65rem 1.25rem', backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>
                ⚡ Gemini Token Telemetry
              </div>
              <TokenHeaderWidget variant="compact" showLabel={true} />
            </div>

            {/* Navigation Links */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.625rem 0.875rem',
                        borderRadius: '0.5rem',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 700 : 500,
                        backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                        color: isActive ? 'var(--primary-700)' : 'var(--text-main)',
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={18} color={isActive ? '#059669' : '#64748b'} />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer with User & Sign Out */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderTop: '1px solid var(--border-light)',
                backgroundColor: '#fafbfc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ minWidth: 0, flex: 1, marginRight: '0.5rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                  Active Session
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #fecdd3',
                  background: '#fff1f2',
                  color: '#be123c',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <LogOut size={14} />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopHeader;
