import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { fetchTokenUsage } from '../services/api';
import { TokenTelemetryModal } from './TokenTelemetryModal';

interface TokenHeaderWidgetProps {
  variant?: 'compact' | 'pill' | 'expanded';
  showLabel?: boolean;
}

export const TokenHeaderWidget: React.FC<TokenHeaderWidgetProps> = ({
  variant = 'pill',
  showLabel = true,
}) => {
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const loadTokens = async () => {
    try {
      const res = await fetchTokenUsage();
      if (res.success && res.tokens) {
        setTotalTokens(res.tokens.totalTokens);
      }
    } catch {
      // Ignore network errors on background poll
    }
  };

  useEffect(() => {
    loadTokens();
    // Poll every 30 seconds to reflect newly generated content
    const interval = setInterval(loadTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTokens = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title="View Gemini AI Token Usage & Performance Telemetry"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: variant === 'compact' ? '0.3rem 0.5rem' : '0.35rem 0.7rem',
          borderRadius: '9999px',
          border: '1px solid #bbf7d0',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          color: '#15803d',
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(16, 185, 129, 0.1)',
          lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#86efac';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 3px 6px rgba(16, 185, 129, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#bbf7d0';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(16, 185, 129, 0.1)';
        }}
      >
        <Zap size={13} color="#16a34a" style={{ flexShrink: 0 }} />
        <span style={{ color: '#166534', fontWeight: 800 }}>
          {totalTokens !== null ? formatTokens(totalTokens) : '—'}
        </span>
        {showLabel && (
          <span style={{ color: '#15803d', fontWeight: 600, fontSize: '0.72rem' }}>
            Tokens
          </span>
        )}
      </button>

      <TokenTelemetryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          loadTokens(); // Refresh count on close
        }}
      />
    </>
  );
};
