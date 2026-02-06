-- Migration: Enforce global barcode uniqueness
-- Each barcode is a unique physical bag; the same barcode must never
-- produce duplicate rows regardless of bag status or location.

-- Step 1: Remove any existing duplicates (keep newest record per barcode)
DELETE FROM bags
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY barcode
                   ORDER BY created_at DESC
               ) AS rn
        FROM bags
    ) ranked
    WHERE rn > 1
);

-- Step 2: Drop the old partial unique index (only enforced status='registered')
DROP INDEX IF EXISTS idx_bags_barcode_active;

-- Step 3: Drop the plain barcode index (now redundant)
DROP INDEX IF EXISTS idx_bags_barcode;

-- Step 4: Create global unique index on barcode alone
CREATE UNIQUE INDEX idx_bags_barcode_unique ON bags (barcode);
