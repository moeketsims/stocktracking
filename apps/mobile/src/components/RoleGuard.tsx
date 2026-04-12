import React from 'react';
import { useAuthStore } from '../stores/authStore';
import type { UserRole } from '../types';

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const hasRole = useAuthStore((s) => s.hasRole);
  if (!hasRole(...roles)) return <>{fallback}</>;
  return <>{children}</>;
}
