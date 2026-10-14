import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CreateCampaignPage: React.FC = () => {
  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/campaigns" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-700)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          <ArrowLeft size={16} /> Back to Campaigns
        </Link>
        <h1 className="title-hero">✨ Create New Campaign</h1>
        <p className="subtitle-hero">Generate culturally-aware Sri Lankan retail copy in 5 language variations</p>
      </div>

      <div className="card">
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Campaign creation wizard with Sinhala, Tamil, Singlish and Tanglish generation will be unlocked in Phase 4.
        </p>
      </div>
    </div>
  );
};

export default CreateCampaignPage;
