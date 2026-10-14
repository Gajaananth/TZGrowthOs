import React from 'react';
import { BarChart3 } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export const ResultsPage: React.FC = () => {
  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="title-hero">📊 Results & Insights</h1>
        <p className="subtitle-hero">Track engagement, leads, sales, and AI performance analysis</p>
      </div>

      <EmptyState
        icon={<BarChart3 size={28} />}
        title="No campaign metrics recorded yet"
        description="After running your marketing campaigns, log impressions and conversions to receive Gemini AI post-campaign evaluations."
      />
    </div>
  );
};

export default ResultsPage;
