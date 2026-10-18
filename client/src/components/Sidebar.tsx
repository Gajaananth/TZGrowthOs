import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Sparkles,
  Megaphone,
  Search,
  BarChart3,
  MessageSquareQuote,
  Calendar,
  Settings,
  LogOut,
  Store,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import { TokenHeaderWidget } from './TokenHeaderWidget';

export const Sidebar: React.FC = () => {

  const { user, business, logout } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
    <aside
      style={{
        width: '260px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
      className="sidebar-desktop"
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.625rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <img src="/logo.png" alt="GrowthOS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-800)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              GrowthOS
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Tradiq Zium Retail AI
            </div>
          </div>
        </div>

        {/* Business Badge */}
        {business && (
          <div
            style={{
              marginTop: '0.375rem',
              padding: '0.375rem 0.625rem',
              backgroundColor: 'var(--primary-50)',
              borderRadius: '0.5rem',
              border: '1px solid var(--primary-100)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Store size={14} color="#059669" />
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-900)' }}>
                {business.name}
              </span>
              {business.city && (
                <span style={{ fontSize: '0.6875rem', color: 'var(--primary-700)', display: 'block', lineHeight: 1 }}>
                  {business.city}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Language Switcher */}
        <div style={{ paddingTop: '0.25rem', display: 'flex', justifyContent: 'center' }}>
          <LanguageSwitcher variant="compact" showLabel={true} style={{ width: '100%', justifyContent: 'space-between' }} />
        </div>
      </div>


      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    color: isActive ? 'var(--primary-700)' : 'var(--text-main)',
                    backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--primary-600)' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={18}
                        color={isActive ? '#059669' : '#64748b'}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / User Profile & Logout */}
      <div
        style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-light)',
          backgroundColor: '#fafbfc',
        }}
      >
        <div style={{ marginBottom: '0.625rem', paddingBottom: '0.625rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534' }}>
            AI Engine
          </span>
          <TokenHeaderWidget variant="compact" showLabel={true} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {user?.email || 'Retailer'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 500 }}>
              Gemini 3.8 Flash Active
            </div>
          </div>
          <button
            onClick={handleLogout}
            title={t('nav.signOut')}
            style={{
              padding: '0.375rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-light)',
              backgroundColor: '#ffffff',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
