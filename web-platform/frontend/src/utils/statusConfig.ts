/**
 * Shared status configuration for consistent styling across pages.
 * These configs are used for status badges/chips, NOT buttons.
 * Orange is reserved for primary action buttons.
 */

import type { StockRequestStatus, TripStatus } from '../types';

interface StatusStyle {
  label: string;
  color: string;
  bgColor: string;
  borderColor?: string;
}

// Request status configuration with borders for better contrast
export const REQUEST_STATUS_CONFIG: Record<StockRequestStatus, StatusStyle> = {
  pending: { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  accepted: { label: 'Accepted', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  trip_created: { label: 'Trip Created', color: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300' },
  in_delivery: { label: 'In Transit', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  fulfilled: { label: 'Fulfilled', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  delivered: { label: 'Delivered', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' },
  partially_fulfilled: { label: 'Partial', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  expired: { label: 'Expired', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
};

// Trip status configuration - muted/pastel colors for status badges
export const TRIP_STATUS_CONFIG: Record<TripStatus, StatusStyle> = {
  planned: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Planned' },
  in_progress: { color: 'text-slate-700', bgColor: 'bg-slate-100', label: 'In Progress' },
  completed: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', label: 'Completed' },
  cancelled: { color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Cancelled' },
};

// Helper to generate short request ID from UUID (e.g., "REQ-1A2B")
export const getShortRequestId = (id: string): string => {
  return `REQ-${id.substring(0, 4).toUpperCase()}`;
};
