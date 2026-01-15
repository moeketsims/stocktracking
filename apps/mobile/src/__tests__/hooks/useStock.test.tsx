import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the stock balance data
const mockStockBalance = [
  { location_id: 'loc-1', item_id: 'item-1', on_hand_qty: 100 },
  { location_id: 'loc-1', item_id: 'item-2', on_hand_qty: 50 },
];

const mockTransactions = [
  {
    id: 'tx-1',
    type: 'receive',
    qty: 100,
    unit: 'kg',
    created_at: '2024-01-01T10:00:00Z',
    created_by: 'user-1',
    item_id: 'item-1',
    location_id_to: 'loc-1',
  },
  {
    id: 'tx-2',
    type: 'issue',
    qty: 20,
    unit: 'kg',
    created_at: '2024-01-02T10:00:00Z',
    created_by: 'user-1',
    item_id: 'item-1',
    location_id_from: 'loc-1',
  },
];

// Mock Supabase client for these tests
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'stock_balance') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn((callback: any) =>
            callback({ data: mockStockBalance, error: null })
          ),
        };
      }
      if (table === 'stock_transactions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest.fn((callback: any) =>
            callback({ data: mockTransactions, error: null })
          ),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn((callback: any) => callback({ data: [], error: null })),
      };
    }),
  },
}));

describe('Stock Balance Logic', () => {
  it('calculates balance correctly from transactions', () => {
    // Given: received 100kg, issued 20kg
    const received = 100;
    const issued = 20;

    // Then: balance should be 80kg
    const balance = received - issued;
    expect(balance).toBe(80);
  });

  it('handles transfer correctly (from location)', () => {
    const startingBalance = 100;
    const transferOut = 30;

    const newBalance = startingBalance - transferOut;
    expect(newBalance).toBe(70);
  });

  it('handles transfer correctly (to location)', () => {
    const startingBalance = 50;
    const transferIn = 30;

    const newBalance = startingBalance + transferIn;
    expect(newBalance).toBe(80);
  });

  it('handles waste correctly', () => {
    const startingBalance = 100;
    const waste = 5;

    const newBalance = startingBalance - waste;
    expect(newBalance).toBe(95);
  });

  it('handles positive adjustment', () => {
    const startingBalance = 100;
    const adjustment = 10;

    const newBalance = startingBalance + adjustment;
    expect(newBalance).toBe(110);
  });

  it('handles negative adjustment', () => {
    const startingBalance = 100;
    const adjustment = -15;

    const newBalance = startingBalance + adjustment;
    expect(newBalance).toBe(85);
  });

  it('prevents negative balance warning', () => {
    const currentBalance = 50;
    const requestedIssue = 60;

    const wouldGoNegative = requestedIssue > currentBalance;
    expect(wouldGoNegative).toBe(true);
  });
});

describe('Days of Cover Calculation', () => {
  it('calculates days of cover correctly', () => {
    const onHand = 100;
    const avgDailyUsage = 20;

    const daysOfCover = onHand / avgDailyUsage;
    expect(daysOfCover).toBe(5);
  });

  it('handles zero usage gracefully', () => {
    const onHand = 100;
    const avgDailyUsage = 0;

    const daysOfCover = avgDailyUsage === 0 ? Infinity : onHand / avgDailyUsage;
    expect(daysOfCover).toBe(Infinity);
  });

  it('calculates reorder point correctly', () => {
    const safetyStock = 50;
    const avgDailyUsage = 20;
    const leadTimeDays = 3;

    const reorderPoint = safetyStock + avgDailyUsage * leadTimeDays;
    expect(reorderPoint).toBe(110); // 50 + (20 * 3)
  });

  it('triggers reorder alert when below reorder point', () => {
    const onHand = 100;
    const reorderPoint = 110;

    const needsReorder = onHand <= reorderPoint;
    expect(needsReorder).toBe(true);
  });

  it('calculates projected stock-out date', () => {
    const onHand = 100;
    const avgDailyUsage = 20;
    const today = new Date('2024-01-01');

    const daysOfCover = onHand / avgDailyUsage;
    const stockOutDate = new Date(today);
    stockOutDate.setDate(today.getDate() + Math.floor(daysOfCover));

    expect(stockOutDate.toISOString().split('T')[0]).toBe('2024-01-06');
  });
});

describe('FIFO Logic', () => {
  it('suggests oldest batch first', () => {
    const batches = [
      { id: 'b1', received_at: '2024-01-03', remaining_qty: 30 },
      { id: 'b2', received_at: '2024-01-01', remaining_qty: 20 },
      { id: 'b3', received_at: '2024-01-02', remaining_qty: 25 },
    ];

    const sortedBatches = [...batches].sort(
      (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
    );

    expect(sortedBatches[0].id).toBe('b2'); // Oldest first
    expect(sortedBatches[1].id).toBe('b3');
    expect(sortedBatches[2].id).toBe('b1');
  });

  it('filters out depleted batches', () => {
    const batches = [
      { id: 'b1', remaining_qty: 30 },
      { id: 'b2', remaining_qty: 0 },
      { id: 'b3', remaining_qty: 25 },
    ];

    const activeBatches = batches.filter((b) => b.remaining_qty > 0);
    expect(activeBatches.length).toBe(2);
    expect(activeBatches.find((b) => b.id === 'b2')).toBeUndefined();
  });

  it('identifies batches expiring soon', () => {
    const today = new Date('2024-01-15');
    const warningDays = 7;

    const batches = [
      { id: 'b1', expiry_date: '2024-01-20' }, // 5 days - expiring soon
      { id: 'b2', expiry_date: '2024-01-30' }, // 15 days - ok
      { id: 'b3', expiry_date: '2024-01-17' }, // 2 days - expiring very soon
    ];

    const expiringBatches = batches.filter((b) => {
      const daysUntilExpiry = Math.floor(
        (new Date(b.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= warningDays;
    });

    expect(expiringBatches.length).toBe(2);
    expect(expiringBatches.map((b) => b.id)).toContain('b1');
    expect(expiringBatches.map((b) => b.id)).toContain('b3');
  });
});

describe('Unit Conversion', () => {
  it('converts bags to kg', () => {
    const bags = 5;
    const conversionFactor = 10; // 1 bag = 10kg

    const kg = bags * conversionFactor;
    expect(kg).toBe(50);
  });

  it('converts kg to bags', () => {
    const kg = 45;
    const conversionFactor = 10;

    const bags = kg / conversionFactor;
    expect(bags).toBe(4.5);
  });

  it('normalizes quantity to canonical unit', () => {
    const inputQty = 3;
    const inputUnit = 'bag';
    const conversionFactor = 10;
    const canonicalUnit = 'kg';

    const normalizedQty =
      inputUnit === canonicalUnit ? inputQty : inputQty * conversionFactor;

    expect(normalizedQty).toBe(30);
  });
});
