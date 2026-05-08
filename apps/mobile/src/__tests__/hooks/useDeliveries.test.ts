import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePendingDeliveries, useConfirmDelivery } from '../../hooks/useDeliveries';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' },
}));

const mockList = jest.fn();
const mockConfirm = jest.fn();

jest.mock('../../api/deliveries', () => ({
  deliveriesApi: {
    list: (...args: unknown[]) => mockList(...args),
    confirm: (...args: unknown[]) => mockConfirm(...args),
  },
}));

jest.mock('../../constants/config', () => ({
  STALE_TIME: 0,
  REFETCH_INTERVAL: false,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('usePendingDeliveries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches pending deliveries', async () => {
    const mockData = { deliveries: [{ id: 'd1', status: 'pending' }], total: 1 };
    mockList.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => usePendingDeliveries(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockList).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('passes custom params to API', async () => {
    const mockData = { deliveries: [], total: 0 };
    mockList.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(
      () => usePendingDeliveries({ status: 'confirmed', location_id: 'loc-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith({ status: 'confirmed', location_id: 'loc-1' });
  });

  it('handles fetch error', async () => {
    mockList.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePendingDeliveries(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useConfirmDelivery', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls confirm endpoint with correct payload', async () => {
    const mockResponse = {
      success: true,
      message: 'Confirmed',
      batch_id: 'b1',
      has_discrepancy: false,
      confirmed_bags: 10,
      confirmed_qty_kg: 100,
      discrepancy_bags: 0,
      discrepancy_kg: 0,
      request_status: 'delivered',
      total_delivered_bags: 10,
      requested_bags: 10,
      remaining_bags: 0,
    };
    mockConfirm.mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => useConfirmDelivery(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'del-1', data: { confirmed_bags: 10 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockConfirm).toHaveBeenCalledWith('del-1', { confirmed_bags: 10 });
  });
});
