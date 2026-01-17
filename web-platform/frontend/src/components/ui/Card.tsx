import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

// Premium enterprise card: r-10, 1px border, minimal shadow, no hover animation
export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',  // 20px - enterprise standard
    lg: 'p-6',
  };

  return (
    <div className={`bg-white rounded-card border border-gray-200 shadow-card ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function CardHeader({ children, className = '', action }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between pb-4 border-b border-gray-100 ${className}`}>
      <h3 className="font-semibold text-gray-800">{children}</h3>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`pt-4 ${className}`}>{children}</div>;
}
