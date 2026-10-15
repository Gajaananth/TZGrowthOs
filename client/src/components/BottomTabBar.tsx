import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Sparkles,
  Megaphone,
  MoreHorizontal,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export const BottomTabBar: React.FC = () => {
  const { t } = useI18n();

  const items = [
    { to: '/', label: t('nav.growthPlan').split(' ')[0], icon: LayoutDashboard },
    { to: '/products', label: t('nav.products'), icon: Package },
    { to: '/priorities', label: t('nav.priorities').split(' ')[0], icon: Sparkles },
    { to: '/campaigns', label: t('nav.campaigns').split(' ')[0], icon: Megaphone },
    { to: '/seo', label: 'SEO', icon: Sparkles },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: '#ffffff',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.04)',
      }}
      className="mobile-tab-bar"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              fontSize: '0.6875rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--primary-600)' : 'var(--text-muted)',
              gap: '2px',
              flex: 1,
              height: '100%',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} color={isActive ? '#059669' : '#94a3b8'} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );
};

export default BottomTabBar;
