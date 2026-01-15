-- EPIC F: Audit Logs Migration
-- Date: 2026-01-08
-- Immutable audit logging for critical actions

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email TEXT,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    before_data JSONB,
    after_data JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Make audit logs immutable (no updates or deletes except for admin cleanup)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
END;
$$;

CREATE TRIGGER audit_logs_immutable_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER audit_logs_immutable_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- ============================================
-- AUDIT LOG FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION log_audit(
    p_action_type VARCHAR(50),
    p_entity_type VARCHAR(50),
    p_entity_id UUID DEFAULT NULL,
    p_before_data JSONB DEFAULT NULL,
    p_after_data JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_audit_id UUID;
    v_actor_email TEXT;
BEGIN
    -- Get actor email
    SELECT email INTO v_actor_email
    FROM auth.users
    WHERE id = auth.uid();

    INSERT INTO audit_logs (
        actor_id,
        actor_email,
        action_type,
        entity_type,
        entity_id,
        before_data,
        after_data,
        metadata
    ) VALUES (
        auth.uid(),
        v_actor_email,
        p_action_type,
        p_entity_type,
        p_entity_id,
        p_before_data,
        p_after_data,
        p_metadata
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;

-- ============================================
-- AUTOMATIC AUDIT TRIGGERS
-- ============================================

-- Profile changes (role changes)
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Only log if role changed
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            PERFORM log_audit(
                'role_change',
                'profiles',
                NEW.id,
                jsonb_build_object('role', OLD.role, 'zone_id', OLD.zone_id, 'location_id', OLD.location_id),
                jsonb_build_object('role', NEW.role, 'zone_id', NEW.zone_id, 'location_id', NEW.location_id),
                jsonb_build_object('user_id', NEW.user_id)
            );
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            'profile_created',
            'profiles',
            NEW.id,
            NULL,
            jsonb_build_object('role', NEW.role, 'zone_id', NEW.zone_id, 'location_id', NEW.location_id),
            jsonb_build_object('user_id', NEW.user_id)
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            'profile_deleted',
            'profiles',
            OLD.id,
            jsonb_build_object('role', OLD.role, 'zone_id', OLD.zone_id, 'location_id', OLD.location_id),
            NULL,
            jsonb_build_object('user_id', OLD.user_id)
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_profile_changes();

-- Reorder policy changes
CREATE OR REPLACE FUNCTION audit_reorder_policy_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        PERFORM log_audit(
            'policy_updated',
            'reorder_policies',
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            'policy_created',
            'reorder_policies',
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            'policy_deleted',
            'reorder_policies',
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL,
            '{}'::jsonb
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_reorder_policies
    AFTER INSERT OR UPDATE OR DELETE ON reorder_policies
    FOR EACH ROW
    EXECUTE FUNCTION audit_reorder_policy_changes();

-- Stock adjustment transactions (type = 'adjustment')
CREATE OR REPLACE FUNCTION audit_stock_adjustments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.type = 'adjustment' THEN
        PERFORM log_audit(
            'stock_adjustment',
            'stock_transactions',
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb,
            jsonb_build_object('notes', NEW.notes)
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_adjustments
    AFTER INSERT ON stock_transactions
    FOR EACH ROW
    WHEN (NEW.type = 'adjustment')
    EXECUTE FUNCTION audit_stock_adjustments();

-- Location changes
CREATE OR REPLACE FUNCTION audit_location_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            'location_created',
            'locations',
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit(
            'location_updated',
            'locations',
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            'location_deleted',
            'locations',
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL,
            '{}'::jsonb
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_locations
    AFTER INSERT OR UPDATE OR DELETE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION audit_location_changes();

-- Zone changes
CREATE OR REPLACE FUNCTION audit_zone_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            'zone_created',
            'zones',
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit(
            'zone_updated',
            'zones',
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            '{}'::jsonb
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            'zone_deleted',
            'zones',
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL,
            '{}'::jsonb
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_zones
    AFTER INSERT OR UPDATE OR DELETE ON zones
    FOR EACH ROW
    EXECUTE FUNCTION audit_zone_changes();

-- ============================================
-- RLS POLICIES FOR AUDIT LOGS
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT
    USING (is_admin());

-- Anyone can insert (via the log_audit function which is SECURITY DEFINER)
-- Direct inserts are allowed but the function handles most cases
CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT
    WITH CHECK (TRUE);
