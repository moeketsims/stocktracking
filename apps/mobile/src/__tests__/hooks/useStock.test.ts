import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStockByLocation, useIssueStock } from '../../hooks/useStock';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' },
}));

const mockGetByLocation = jest.fn();
const mockIssue = jest.fn();

jest.mock('../../api/stock', () => ({
  stockApi: {
    getByLocation: (...args: unknown[]) => mockGetByLocation(...args),
    issue: (...args: unknown[]) => mockIssue(...args),
  },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../constants/config', () => ({
  STALE_TIME: 0,
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

describe('useStockByLocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches stock by location', async () => {
    const mockData = {
      locations: [
        { location_id: 'loc-1', location_name: 'Shop A', on_hand_qty: 50, status: 'in_stock' },
      ],
      total_stock_kg: 50,
    };
    mockGetByLocation.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useStockByLocation(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockGetByLocation).toHaveBeenCalledTimes(1);
  });

  it('handles fetch error', async () => {
    mockGetByLocation.mockRejectedValueOnce(new Error('Forbidden'));

    const { result } = renderHook(() => useStockByLocation(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useIssueStock', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls issue endpoint with correct payload', async () => {
    const mockResponse = {
      success: true,
      message: 'Issued 2 bags',
      transaction_id: 'txn-1',
      batch_id: 'b-1',
    };
    mockIssue.mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => useIssueStock(), { wrapper: createWrapper() });

    result.current.mutate({ quantity: 2, unit: 'bag' as const });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockIssue).toHaveBeenCalledWith({ quantity: 2, unit: 'bag' });
  });

  it('handles issue error', async () => {
    mockIssue.mockRejectedValueOnce({
      response: { data: { detail: 'Insufficient stock' } },
    });

    const { result } = renderHook(() => useIssueStock(), { wrapper: createWrapper() });

    result.current.mutate({ quantity: 999, unit: 'bag' as const });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
