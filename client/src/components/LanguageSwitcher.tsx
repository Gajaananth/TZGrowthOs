import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

interface LanguageSwitcherProps {
  variant?: 'pill' | 'compact' | 'badge';
  showLabel?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'si', label: 'සිංහල', short: 'සිං', flag: '🇱🇰' },
  { code: 'ta', label: 'தமிழ்', short: 'த', flag: '🇱🇰' },
] as const;

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'pill',
  showLabel = true,
  className,
  style,
}) => {
  const { language, setLanguage } = useI18n();

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: variant === 'badge' ? '0.2rem 0.35rem' : '0.25rem 0.4rem',
        background: '#ffffff',
        border: '1px solid var(--border-medium)',
        borderRadius: '9999px',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 10,
        ...style,
      }}
    >
      {showLabel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            paddingLeft: '0.4rem',
            paddingRight: '0.2rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            userSelect: 'none',
          }}
        >
          <Globe size={13} color="var(--primary-600)" />
          <span style={{ fontSize: '0.72rem' }}>Lang:</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
        {LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              title={lang.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: variant === 'compact' ? '0.2rem 0.45rem' : '0.25rem 0.55rem',
                fontSize: '0.75rem',
                fontWeight: isActive ? 700 : 500,
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? 'var(--primary-600)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              {lang.short}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
