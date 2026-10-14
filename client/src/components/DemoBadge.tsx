import React from 'react';

export const DemoBadge: React.FC = () => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.125rem 0.5rem',
        fontSize: '0.6875rem',
        fontWeight: 700,
        borderRadius: '9999px',
        backgroundColor: '#fef3c7',
        color: '#b45309',
        border: '1px solid #fde68a',
        letterSpacing: '0.025em',
        textTransform: 'uppercase',
        marginLeft: '0.5rem'
      }}
      title="This is sample demo data"
    >
      DEMO
    </span>
  );
};

export default DemoBadge;
