-- Migration: 005_stock_tracking_system.sql
-- Description: Adds tables for real-time stock ledger and batch tracking

-- 1. Table for Stock Batches (When a delivery is received)
CREATE TABLE IF NOT EXISTS public.stock_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id), -- Assuming an items table exists
    delivery_id UUID REFERENCES public.deliveries(id), -- Link to the trip/delivery
    supplier_id UUID,
    total_qty INTEGER NOT NULL, -- Number of bags received
    remaining_qty INTEGER NOT NULL, -- Number of bags left in this specific batch
    received_at TIMESTAMPTZ DEFAULT NOW(),
    received_by UUID REFERENCES auth.users(id),
    photo_url TEXT, -- Audit photo of the stack
    status TEXT DEFAULT 'active' -- 'active', 'finished', 'spoiled'
);

-- 2. Table for Stock Transactions (The Ledger)
CREATE TABLE IF NOT EXISTS public.stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.stock_batches(id),
    item_id UUID NOT NULL REFERENCES public.items(id),
    transaction_type TEXT NOT NULL, -- 'receive', 'consume', 'adjustment', 'waste'
    quantity INTEGER NOT NULL, -- Negative for consumption, positive for receiving
    current_balance INTEGER NOT NULL, -- Stock level AFTER this transaction
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_stock_batches_item_id ON public.stock_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_id ON public.stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_batch_id ON public.stock_ledger(batch_id);

-- Enable RLS
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
