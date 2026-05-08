import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAvailableRequests, useMyRequests, useAcceptRequest } from '../../hooks/useRequests';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

// Mock react-native Alert
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' },
}));

// Mock the API module
const mockGetAvailable = jest.fn();
const mockList = jest.fn();
const mockAccept = jest.fn();

jest.mock('../../api/requests', () => ({
  requestsApi: {
    getAvailable: (...args: unknown[]) => mockGetAvailable(...args),
    list: (...args: unknown[]) => mockList(...args),
    accept: (...args: unknown[]) => mockAccept(...args),
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

describe('useAvailableRequests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns available requests on success', async () => {
    const mockData = { requests: [{ id: '1', status: 'pending' }], total: 1 };
    mockGetAvailable.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useAvailableRequests(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockGetAvailable).toHaveBeenCalledTimes(1);
  });

  it('handles API error gracefully', async () => {
    mockGetAvailable.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAvailableRequests(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe('useMyRequests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns requests filtered by status', async () => {
    const mockData = { requests: [{ id: '2', status: 'accepted' }], total: 1 };
    mockList.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useMyRequests('accepted'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockList).toHaveBeenCalledWith({ status: 'accepted' });
  });
});

describe('useAcceptRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls accept endpoint with correct id', async () => {
    const mockResponse = { success: true, message: 'Accepted', request: { id: '1' } };
    mockAccept.mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => useAcceptRequest(), { wrapper: createWrapper() });

    result.current.mutate('request-123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAccept).toHaveBeenCalledWith('request-123');
  });
});
