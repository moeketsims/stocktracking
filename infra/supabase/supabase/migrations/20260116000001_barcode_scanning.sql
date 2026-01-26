-- Barcode Scanning System
-- Version: 1.0
-- Date: 2026-01-16
-- Features: Mobile camera barcode scanning for stock intake

-- ============================================
-- BARCODE FORMAT ENUM
-- ============================================

CREATE TYPE barcode_format AS ENUM (
    'ean13',      -- Standard EAN-13 (GTIN-13)
    'ean8',       -- EAN-8 compact
    'gs1_128',    -- GS1-128 with embedded data (weight, dates)
    'itf14',      -- ITF-14 for outer cartons
    'code128',    -- Generic Code 128
    'qrcode',     -- QR codes
    'custom'      -- Supplier-specific format
);

-- ============================================
-- SUPPLIER BARCODE MAPPINGS
-- ============================================
-- Maps supplier-specific barcodes to internal items

CREATE TABLE supplier_barcode_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,

    -- Barcode configuration
    barcode_pattern VARCHAR(100) NOT NULL,      -- Exact barcode or regex pattern
    barcode_prefix VARCHAR(50),                  -- e.g., "29" for weight-embedded
    barcode_format barcode_format NOT NULL DEFAULT 'ean13',

    -- Weight extraction for GS1-128 barcodes
    weight_embedded BOOLEAN DEFAULT FALSE,
    weight_start_position INTEGER,               -- Position in barcode string
    weight_length INTEGER,                       -- Number of digits
    weight_decimal_places INTEGER DEFAULT 3,     -- e.g., 3 means divide by 1000
    weight_unit VARCHAR(10) DEFAULT 'kg',

    -- Fixed quantity fallback (for non-weight barcodes)
    default_quantity_kg DECIMAL(10,2),
    default_bag_size VARCHAR(20),                -- '7kg', '10kg', '15kg'

    -- SA Potato context
    variety_name VARCHAR(100),                   -- 'Mondial', 'Sifra', 'Valor', etc.

    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    UNIQUE(supplier_id, barcode_pattern)
);

-- Indexes for fast lookup
CREATE INDEX idx_barcode_mappings_supplier ON supplier_barcode_mappings(supplier_id) WHERE is_active = TRUE;
CREATE INDEX idx_barcode_mappings_prefix ON supplier_barcode_mappings(barcode_prefix) WHERE is_active = TRUE AND barcode_prefix IS NOT NULL;
CREATE INDEX idx_barcode_mappings_pattern ON supplier_barcode_mappings(barcode_pattern);

-- ============================================
-- SCAN SESSIONS
-- ============================================
-- Tracks bulk scanning sessions for receiving deliveries

CREATE TABLE barcode_scan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

    -- Session metadata
    session_type VARCHAR(50) NOT NULL DEFAULT 'receive',  -- 'receive', 'audit', 'transfer'
    status VARCHAR(20) DEFAULT 'in_progress',              -- 'in_progress', 'completed', 'cancelled'

    -- Aggregated data
    total_scans INTEGER DEFAULT 0,
    successful_scans INTEGER DEFAULT 0,
    failed_scans INTEGER DEFAULT 0,
    total_quantity_kg DECIMAL(10,2) DEFAULT 0,

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    created_by UUID NOT NULL,

    notes TEXT
);

CREATE INDEX idx_scan_sessions_location ON barcode_scan_sessions(location_id);
CREATE INDEX idx_scan_sessions_trip ON barcode_scan_sessions(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX idx_scan_sessions_status ON barcode_scan_sessions(status);
CREATE INDEX idx_scan_sessions_created ON barcode_scan_sessions(created_at DESC);

-- ============================================
-- SCAN LOGS
-- ============================================
-- Individual barcode scans within a session

CREATE TABLE barcode_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES barcode_scan_sessions(id) ON DELETE CASCADE,

    -- Raw scan data
    raw_barcode VARCHAR(200) NOT NULL,
    barcode_format barcode_format,

    -- Parsed/matched data
    mapping_id UUID REFERENCES supplier_barcode_mappings(id) ON DELETE SET NULL,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

    -- Extracted values
    extracted_weight_kg DECIMAL(10,2),
    extracted_batch_number VARCHAR(50),
    extracted_date DATE,

    -- Final resolved values
    final_quantity_kg DECIMAL(10,2) NOT NULL,
    variety_name VARCHAR(100),

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'confirmed', 'rejected', 'duplicate'
    rejection_reason TEXT,

    -- Links to created records (after bulk receive)
    batch_id UUID REFERENCES stock_batches(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES stock_transactions(id) ON DELETE SET NULL,

    -- Metadata
    scanned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID,

    notes TEXT
);

CREATE INDEX idx_scan_logs_session ON barcode_scan_logs(session_id);
CREATE INDEX idx_scan_logs_barcode ON barcode_scan_logs(raw_barcode);
CREATE INDEX idx_scan_logs_status ON barcode_scan_logs(status);
CREATE INDEX idx_scan_logs_item ON barcode_scan_logs(item_id) WHERE item_id IS NOT NULL;

-- ============================================
-- MODIFY EXISTING TABLES
-- ============================================

-- Add variety column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS variety VARCHAR(100);

-- Add scan session reference to stock_batches
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS scan_session_id UUID REFERENCES barcode_scan_sessions(id) ON DELETE SET NULL;
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS scanned_barcode VARCHAR(200);

CREATE INDEX idx_batches_scan_session ON stock_batches(scan_session_id) WHERE scan_session_id IS NOT NULL;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE supplier_barcode_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_scan_logs ENABLE ROW LEVEL SECURITY;

-- Barcode mappings: All authenticated can view, managers can manage
CREATE POLICY "Authenticated users can view barcode mappings" ON supplier_barcode_mappings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can manage barcode mappings" ON supplier_barcode_mappings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    );

-- Scan sessions: All authenticated can view, managers can manage
CREATE POLICY "Authenticated users can view scan sessions" ON barcode_scan_sessions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can manage scan sessions" ON barcode_scan_sessions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    );

-- Scan logs: All authenticated can view, managers can manage
CREATE POLICY "Authenticated users can view scan logs" ON barcode_scan_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can manage scan logs" ON barcode_scan_logs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'zone_manager', 'location_manager')
        )
    );

-- Service role bypass for all tables
CREATE POLICY "Service role bypass for barcode_mappings" ON supplier_barcode_mappings
    FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass for scan_sessions" ON barcode_scan_sessions
    FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass for scan_logs" ON barcode_scan_logs
    FOR ALL TO service_role USING (true);

-- ============================================
-- SEED DATA: SA POTATO VARIETIES
-- ============================================

-- Update existing items with variety info
UPDATE items SET variety = 'Mixed' WHERE sku IN ('POT-001', 'POT-BAG', 'POT-WASH');
UPDATE items SET variety = 'Baby' WHERE sku = 'POT-BABY';
UPDATE items SET variety = 'Sweet' WHERE sku = 'POT-SWT';

-- Insert new variety-specific items
INSERT INTO items (id, sku, name, unit, conversion_factor, variety) VALUES
    (gen_random_uuid(), 'POT-MON-7', 'Mondial 7kg Pocket', 'bag', 7.0, 'Mondial'),
    (gen_random_uuid(), 'POT-MON-10', 'Mondial 10kg Pocket', 'bag', 10.0, 'Mondial'),
    (gen_random_uuid(), 'POT-MON-15', 'Mondial 15kg Pocket', 'bag', 15.0, 'Mondial'),
    (gen_random_uuid(), 'POT-SIF-7', 'Sifra 7kg Pocket', 'bag', 7.0, 'Sifra'),
    (gen_random_uuid(), 'POT-SIF-10', 'Sifra 10kg Pocket', 'bag', 10.0, 'Sifra'),
    (gen_random_uuid(), 'POT-VAL-10', 'Valor 10kg Pocket', 'bag', 10.0, 'Valor'),
    (gen_random_uuid(), 'POT-VAL-15', 'Valor 15kg Pocket', 'bag', 15.0, 'Valor'),
    (gen_random_uuid(), 'POT-BP1-10', 'BP1 10kg Pocket', 'bag', 10.0, 'BP1'),
    (gen_random_uuid(), 'POT-FIA-10', 'Fianna 10kg Pocket', 'bag', 10.0, 'Fianna')
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    conversion_factor = EXCLUDED.conversion_factor,
    variety = EXCLUDED.variety;
