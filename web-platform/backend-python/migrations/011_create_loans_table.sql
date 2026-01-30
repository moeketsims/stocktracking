-- Migration: Create loans table for inter-shop stock borrowing
-- This allows shops to borrow stock from other shops and track the loan lifecycle

-- Create loan status enum type
DO $$ BEGIN
    CREATE TYPE loan_status AS ENUM (
        'pending',           -- Initial request, awaiting lender response
        'accepted',          -- Lender accepted (possibly with modified qty), awaiting borrower confirmation
        'rejected',          -- Lender or borrower rejected the request/counter-offer
        'confirmed',         -- Borrower confirmed, awaiting pickup assignment
        'in_transit',        -- Driver assigned, pickup in progress
        'active',            -- Stock delivered to borrower, loan is ongoing
        'return_in_transit', -- Return delivery in progress
        'completed',         -- Stock returned to lender
        'overdue'            -- Past return date and not yet returned
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parties involved
    borrower_location_id UUID NOT NULL REFERENCES locations(id),
    lender_location_id UUID NOT NULL REFERENCES locations(id),
    requested_by UUID NOT NULL REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),

    -- Quantity tracking
    quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
    quantity_approved INTEGER CHECK (quantity_approved > 0),

    -- Dates
    estimated_return_date DATE NOT NULL,
    actual_return_date TIMESTAMPTZ,

    -- Status
    status loan_status NOT NULL DEFAULT 'pending',

    -- Trip references for delivery tracking
    pickup_trip_id UUID REFERENCES trips(id),
    return_trip_id UUID REFERENCES trips(id),

    -- Additional info
    notes TEXT,
    rejection_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT different_locations CHECK (borrower_location_id != lender_location_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_loans_borrower_location ON loans(borrower_location_id);
CREATE INDEX IF NOT EXISTS idx_loans_lender_location ON loans(lender_location_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_requested_by ON loans(requested_by);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loans_estimated_return_date ON loans(estimated_return_date);

-- Add comments for documentation
COMMENT ON TABLE loans IS 'Inter-shop stock loans - allows shops to borrow and return stock from each other';
COMMENT ON COLUMN loans.borrower_location_id IS 'The shop requesting/receiving the loaned stock';
COMMENT ON COLUMN loans.lender_location_id IS 'The shop providing the loaned stock';
COMMENT ON COLUMN loans.quantity_requested IS 'Original quantity requested by borrower (in bags)';
COMMENT ON COLUMN loans.quantity_approved IS 'Quantity approved by lender (may differ from requested)';
COMMENT ON COLUMN loans.pickup_trip_id IS 'Trip for picking up the loaned stock from lender';
COMMENT ON COLUMN loans.return_trip_id IS 'Trip for returning the stock to lender';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loans_updated_at_trigger ON loans;
CREATE TRIGGER loans_updated_at_trigger
    BEFORE UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION update_loans_updated_at();

-- Enable RLS
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view loans involving their location
CREATE POLICY "Users can view loans for their location" ON loans
    FOR SELECT
    USING (
        borrower_location_id IN (SELECT location_id FROM profiles WHERE user_id = auth.uid())
        OR lender_location_id IN (SELECT location_id FROM profiles WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'owner')
    );

-- Users can create loan requests for their location
CREATE POLICY "Users can create loans for their location" ON loans
    FOR INSERT
    WITH CHECK (
        borrower_location_id IN (SELECT location_id FROM profiles WHERE user_id = auth.uid())
    );

-- Users can update loans involving their location
CREATE POLICY "Users can update loans for their location" ON loans
    FOR UPDATE
    USING (
        borrower_location_id IN (SELECT location_id FROM profiles WHERE user_id = auth.uid())
        OR lender_location_id IN (SELECT location_id FROM profiles WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'owner')
    );
