import type { StockRequestStatus, TripStatus, PendingDeliveryStatus, LoanStatus, StockRequestUrgency } from '../types';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

export function getRequestStatusLabel(status: StockRequestStatus): string {
  const map: Record<StockRequestStatus, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    trip_created: 'Trip Created',
    in_delivery: 'In Delivery',
    fulfilled: 'Fulfilled',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    partially_fulfilled: 'Partial',
    expired: 'Expired',
    time_proposed: 'Time Proposed',
  };
  return map[status] ?? status;
}

export function getRequestStatusVariant(status: StockRequestStatus): BadgeVariant {
  const map: Record<StockRequestStatus, BadgeVariant> = {
    pending: 'warning',
    accepted: 'info',
    trip_created: 'info',
    in_delivery: 'primary',
    fulfilled: 'success',
    delivered: 'success',
    cancelled: 'neutral',
    partially_fulfilled: 'warning',
    expired: 'error',
    time_proposed: 'info',
  };
  return map[status] ?? 'neutral';
}

export function getTripStatusLabel(status: TripStatus): string {
  const map: Record<TripStatus, string> = {
    planned: 'Planned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}

export function getTripStatusVariant(status: TripStatus): BadgeVariant {
  const map: Record<TripStatus, BadgeVariant> = {
    planned: 'info',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'neutral',
  };
  return map[status] ?? 'neutral';
}

export function getUrgencyVariant(urgency: StockRequestUrgency): BadgeVariant {
  return urgency === 'urgent' ? 'error' : 'neutral';
}

export function getDeliveryStatusLabel(status: PendingDeliveryStatus): string {
  const map: Record<PendingDeliveryStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
  };
  return map[status] ?? status;
}

export function getDeliveryStatusVariant(status: PendingDeliveryStatus): BadgeVariant {
  const map: Record<PendingDeliveryStatus, BadgeVariant> = {
    pending: 'warning',
    confirmed: 'success',
    rejected: 'error',
  };
  return map[status] ?? 'neutral';
}

export function getLoanStatusLabel(status: LoanStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getLoanStatusVariant(status: LoanStatus): BadgeVariant {
  if (['completed'].includes(status)) return 'success';
  if (['rejected', 'overdue'].includes(status)) return 'error';
  if (['pending', 'return_initiated'].includes(status)) return 'warning';
  return 'info';
}
