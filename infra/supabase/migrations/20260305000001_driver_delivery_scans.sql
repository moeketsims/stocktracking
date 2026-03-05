-- Store driver-side barcode scans on pending deliveries so managers can confirm
-- quantity without re-scanning at handoff.

ALTER TABLE public.pending_deliveries
ADD COLUMN IF NOT EXISTS driver_scanned_barcodes text[] NOT NULL DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS driver_scanned_qty_kg double precision,
ADD COLUMN IF NOT EXISTS driver_scanned_by uuid,
ADD COLUMN IF NOT EXISTS driver_scanned_at timestamp with time zone;

ALTER TABLE public.pending_deliveries
DROP CONSTRAINT IF EXISTS pending_deliveries_driver_scanned_qty_kg_check;

ALTER TABLE public.pending_deliveries
ADD CONSTRAINT pending_deliveries_driver_scanned_qty_kg_check
CHECK (
    driver_scanned_qty_kg IS NULL
    OR driver_scanned_qty_kg >= 0
);
