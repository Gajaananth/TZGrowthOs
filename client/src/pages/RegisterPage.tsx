import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

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
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-xl)',
          padding: '2.25rem',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #059669, #047857)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              marginBottom: '1rem',
              boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)',
            }}
          >
            🌱
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
