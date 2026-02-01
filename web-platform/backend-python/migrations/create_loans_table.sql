-- Create loans table for inter-shop stock borrowing
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_location_id UUID NOT NULL REFERENCES public.locations(id),
    lender_location_id UUID NOT NULL REFERENCES public.locations(id),
    requested_by UUID NOT NULL REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    quantity_requested INTEGER NOT NULL,
    quantity_approved INTEGER,
    estimated_return_date DATE NOT NULL,
    actual_return_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    rejection_reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'confirmed', 'in_transit', 'active', 'overdue', 'return_in_transit', 'completed')),
    pickup_trip_id UUID REFERENCES public.trips(id),
    return_trip_id UUID REFERENCES public.trips(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_loans_borrower_location ON public.loans(borrower_location_id);
CREATE INDEX IF NOT EXISTS idx_loans_lender_location ON public.loans(lender_location_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON public.loans(created_at DESC);

-- Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read loans involving their location
CREATE POLICY "Users can view loans involving their location" ON public.loans
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
    );

-- Create policy for authenticated users to insert loans
CREATE POLICY "Users can create loan requests" ON public.loans
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Create policy for authenticated users to update loans
CREATE POLICY "Users can update loans involving their location" ON public.loans
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loans_updated_at_trigger
    BEFORE UPDATE ON public.loans
    FOR EACH ROW
    EXECUTE FUNCTION update_loans_updated_at();

-- Grant access to authenticated users
GRANT ALL ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
