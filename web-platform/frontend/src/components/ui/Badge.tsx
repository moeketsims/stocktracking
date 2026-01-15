import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
  outline?: boolean;
}

export default function Badge({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  outline = false,
}: BadgeProps) {
  const solidVariants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  const outlineVariants = {
    default: 'border border-gray-300 text-gray-700 bg-transparent',
    success: 'border border-green-500 text-green-600 bg-transparent',
    warning: 'border border-amber-500 text-amber-600 bg-transparent',
    error: 'border border-red-500 text-red-600 bg-transparent',
    info: 'border border-blue-500 text-blue-600 bg-transparent',
  };

  const variants = outline ? outlineVariants : solidVariants;

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {outline && variant === 'success' && (
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
      )}
      {children}
    </span>
  );
}
