import React from 'react';
import { Badge } from './ui/Badge';
import {
  getRequestStatusLabel,
  getRequestStatusVariant,
  getTripStatusLabel,
  getTripStatusVariant,
  getDeliveryStatusLabel,
  getDeliveryStatusVariant,
  getLoanStatusLabel,
  getLoanStatusVariant,
} from '../utils/status';
import type {
  StockRequestStatus,
  TripStatus,
  PendingDeliveryStatus,
  LoanStatus,
} from '../types';

type StatusType = 'request' | 'trip' | 'delivery' | 'loan';

interface StatusBadgeProps {
  status: string;
  type: StatusType;
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  switch (type) {
    case 'request':
      return (
        <Badge
          label={getRequestStatusLabel(status as StockRequestStatus)}
          variant={getRequestStatusVariant(status as StockRequestStatus)}
        />
      );
    case 'trip':
      return (
        <Badge
          label={getTripStatusLabel(status as TripStatus)}
          variant={getTripStatusVariant(status as TripStatus)}
        />
      );
    case 'delivery':
      return (
        <Badge
          label={getDeliveryStatusLabel(status as PendingDeliveryStatus)}
          variant={getDeliveryStatusVariant(status as PendingDeliveryStatus)}
        />
      );
    case 'loan':
      return (
        <Badge
          label={getLoanStatusLabel(status as LoanStatus)}
          variant={getLoanStatusVariant(status as LoanStatus)}
        />
      );
  }
}
