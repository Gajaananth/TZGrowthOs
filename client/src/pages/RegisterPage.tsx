import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('retail');
  const [city, setCity] = useState('Colombo');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await register({
      email,
      password,
      businessName,
      businessType,
      city,
    });
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Failed to create business account.');
    }
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
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'clamp(1.25rem, 5vw, 2.25rem)',
          position: 'relative',
        }}
      >
        {/* Header */}
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
            {t('auth.registerTitle')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
            {t('auth.registerSubtitle')}
          </p>
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
            <label className="form-label">{t('auth.storeNameLabel')}</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Lanka Spice Boutique"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('auth.storeTypeLabel')}</label>
              <select
                className="form-select"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                <option value="retail">General Retail</option>
                <option value="clothing">Clothing & Apparel</option>
                <option value="groceries">Grocery & Supermarket</option>
                <option value="electronics">Electronics & Tech</option>
                <option value="handicrafts">Crafts & Souvenirs</option>
                <option value="cosmetics">Health & Beauty</option>
                <option value="food">Bakery & Food</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.cityLabel')}</label>
              <select
                className="form-select"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="Colombo">Colombo</option>
                <option value="Kandy">Kandy</option>
                <option value="Galle">Galle</option>
                <option value="Jaffna">Jaffna</option>
                <option value="Negombo">Negombo</option>
                <option value="Gampaha">Gampaha</option>
                <option value="Kurunegala">Kurunegala</option>
                <option value="Matara">Matara</option>
                <option value="Batticaloa">Batticaloa</option>
                <option value="Anuradhapura">Anuradhapura</option>
              </select>
            </div>
          </div>

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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={loading}
          >
            {loading ? (
              'Creating business account...'
            ) : (
              <>
                <UserPlus size={18} />
                <span>{t('auth.registerBtn')}</span>
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
          <Link
            to="/login"
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
            <ArrowLeft size={14} />
            <span>{t('auth.alreadyHaveAccount')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
