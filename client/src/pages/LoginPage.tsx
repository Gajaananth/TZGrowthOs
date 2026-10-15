import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@tradiq.lk');
    setPassword('growthos2026');
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: 'clamp(0.75rem, 3vw, 1.5rem)',
        position: 'relative',
      }}
    >
      {/* Top Floating Language Selector */}
      <div
        style={{
          position: 'absolute',
          top: 'clamp(0.75rem, 2vw, 1.25rem)',
          right: 'clamp(0.75rem, 2vw, 1.25rem)',
          zIndex: 10,
        }}
      >
        <LanguageSwitcher variant="pill" showLabel={true} />
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'clamp(1.25rem, 5vw, 2.25rem)',
          position: 'relative',
        }}
      >
        {/* Card Header with Logo & In-Card Language Quick Toggle */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <LanguageSwitcher variant="compact" showLabel={false} />
          </div>
          <div
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
              overflow: 'hidden',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
            }}
          >
            <img src="/logo.png" alt="GrowthOS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            {t('auth.welcomeBack')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Demo Quick-Fill Pill */}
        <div
          style={{
            backgroundColor: 'var(--primary-50)',
            border: '1px solid var(--primary-200)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} color="#059669" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-900)' }}>
              Evaluating GrowthOS?
            </span>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            style={{
              background: '#ffffff',
              border: '1px solid var(--primary-300)',
              color: 'var(--primary-700)',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
            }}
          >
            Fill Demo
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#9f1239',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.emailLabel')}</label>
            <input
              type="email"
              className="form-input"
              placeholder="owner@store.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.passwordLabel')}</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? (
              'Signing in...'
            ) : (
              <>
                <LogIn size={18} />
                <span>{t('auth.signInBtn')}</span>
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
          <Link
            to="/register"
            style={{
              color: 'var(--primary-700)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span>{t('auth.createAccountLink')}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
