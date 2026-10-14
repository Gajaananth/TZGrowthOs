import React from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

export const ReviewPage: React.FC = () => {
  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="title-hero">📢 Campaigns & Approvals</h1>
          <p className="subtitle-hero">Review, refine, and approve multilingual campaigns before publishing</p>
        </div>
        <Link to="/campaigns/new" className="btn btn-primary">
          <Plus size={16} /> Create Campaign
        </Link>
      </div>

      <EmptyState
        icon={<Megaphone size={28} />}
        title="No campaigns created yet"
        description="Create your first campaign to generate multi-language captions for Facebook, Instagram, TikTok and WhatsApp with built-in cultural review."
        actionText="Create First Campaign"
        onAction={() => window.location.href = '/campaigns/new'}
      />
    </div>
  );
};

export default ReviewPage;
