import React from 'react';
import { Search } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export const SeoHelperPage: React.FC = () => {
  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="title-hero">🔍 Local SEO Helper</h1>
        <p className="subtitle-hero">Improve your search rankings on Google Search and Google Maps across Sri Lanka</p>
      </div>

      <EmptyState
        icon={<Search size={28} />}
        title="SEO Recommendations"
        description="Select any product to generate optimized meta titles, descriptions, local keywords, and schema markup."
      />
    </div>
  );
};

export default SeoHelperPage;
