import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTrips, useCompleteStop } from '../../hooks/useTrips';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' },
}));

const mockList = jest.fn();
const mockCompleteStop = jest.fn();

jest.mock('../../api/trips', () => ({
  tripsApi: {
    list: (...args: unknown[]) => mockList(...args),
    completeStop: (...args: unknown[]) => mockCompleteStop(...args),
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

describe('useTrips', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches and returns trips', async () => {
    const mockData = { trips: [{ id: 't1', status: 'in_progress' }], total: 1 };
    mockList.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useTrips({ status: 'in_progress' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockList).toHaveBeenCalledWith({ status: 'in_progress' });
  });

  it('handles fetch error', async () => {
    mockList.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useTrips(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe('useCompleteStop', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls completeStop with correct payload', async () => {
    const mockResponse = {
      success: true,
      message: 'Stop completed',
      stop: { id: 's1' },
      trip_completed: false,
      pending_delivery_id: 'd1',
    };
    mockCompleteStop.mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => useCompleteStop(), { wrapper: createWrapper() });

    const payload = { stopId: 'stop-1', data: { actual_bags: 10, notes: 'OK' } };
    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCompleteStop).toHaveBeenCalledWith('stop-1', { actual_bags: 10, notes: 'OK' });
  });

  it('handles mutation error', async () => {
    mockCompleteStop.mockRejectedValueOnce({
      response: { data: { detail: 'Stop already completed' } },
    });

    const { result } = renderHook(() => useCompleteStop(), { wrapper: createWrapper() });

    result.current.mutate({ stopId: 'stop-1', data: { actual_bags: 5 } });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
