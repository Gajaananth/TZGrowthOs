import React from 'react';
import { MessageSquareQuote } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export const ChatPage: React.FC = () => {
  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="title-hero">💬 Ask GrowthOS</h1>
        <p className="subtitle-hero">Direct retail strategy assistant grounded in your products, sales history, and upcoming holidays</p>
      </div>

      <EmptyState
        icon={<MessageSquareQuote size={28} />}
        title="AI Retail Strategist"
        description="Grounded in your business data. Ask questions like: 'What should I bundle for Sinhala New Year?' or 'How can I clear slow-moving inventory?'"
      />
    </div>
  );
};

export default ChatPage;
