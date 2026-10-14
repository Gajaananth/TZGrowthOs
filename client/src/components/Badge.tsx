import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'gold' | 'blue' | 'rose' | 'gray';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'green',
  className = '',
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
