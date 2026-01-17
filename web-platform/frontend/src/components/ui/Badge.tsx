import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
  outline?: boolean;
}

// Premium enterprise chip: r-6, height 22-24px, muted backgrounds
export default function Badge({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  outline = false,
}: BadgeProps) {
  // Muted status colors - never same saturation as action buttons
  const solidVariants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-700',
    info: 'bg-slate-100 text-slate-700',
  };

  const outlineVariants = {
    default: 'border border-gray-200 text-gray-600 bg-transparent',
    success: 'border border-emerald-200 text-emerald-600 bg-transparent',
    warning: 'border border-amber-200 text-amber-600 bg-transparent',
    error: 'border border-red-200 text-red-600 bg-transparent',
    info: 'border border-slate-200 text-slate-600 bg-transparent',
  };

  const variants = outline ? outlineVariants : solidVariants;

  // Height: 20px (sm), 22-24px (md) with proper padding
  const sizes = {
    sm: 'h-5 px-2 text-xs',
    md: 'h-[22px] px-2.5 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-chip ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {outline && variant === 'success' && (
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5" />
      )}
      {children}
    </span>
  );
}
