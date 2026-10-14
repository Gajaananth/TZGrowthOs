import React from 'react';
import { Settings, Store, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { business } = useAuth();

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="title-hero">⚙️ Settings & Business Profile</h1>
        <p className="subtitle-hero">Configure your retail brand tone, primary languages, and growth objectives</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <Store size={18} color="#059669" />
              <span>Business Profile</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Store Name:</span>{' '}
              <strong>{business?.name || 'My Retail Store'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Category:</span>{' '}
              <strong>{business?.business_type || 'Retail'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>City:</span>{' '}
              <strong>{business?.city || 'Colombo'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Brand Tone:</span>{' '}
              <strong>{business?.brand_tone || 'Friendly'}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <Sparkles size={18} color="#059669" />
              <span>AI Engine Info</span>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Powered exclusively by Google Gemini 2.5 Flash with validated JSON mode schema outputs.
          </p>
          <div className="badge badge-green">
            Built for Google Cloud AI Builder Cup 2026
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
