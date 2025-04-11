-- Create types and helper functions for the permission system
CREATE TYPE permission_level AS ENUM ('viewer', 'editor', 'manager');

-- Create a function to validate role format
CREATE OR REPLACE FUNCTION is_valid_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Valid formats:
    -- 1. Global role: viewer, editor, manager
    -- 2. Resource type role: {resource}_viewer, {resource}_editor, {resource}_manager
    -- 3. Specific resource role: {resource}_{id}_{level}
    RETURN role_name ~ '^([a-z_]+_)?([a-z0-9]+_)?(viewer|editor|manager)$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create permissions table to store roles as tags
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (is_valid_role(role)),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(supabase_id, role)
);

-- Create indexes for performance
CREATE INDEX idx_permissions_supabase_id ON public.permissions(supabase_id);
CREATE INDEX idx_permissions_role ON public.permissions(role);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create permission check function that bypasses RLS
CREATE OR REPLACE FUNCTION has_permission(
    user_uid UUID,
    required_resource TEXT,
    required_id TEXT,
    required_level permission_level
)
RETURNS BOOLEAN AS $$
DECLARE
    role_exists BOOLEAN;
BEGIN
    -- Check for service role which bypasses all checks
    IF auth.role() = 'service_role' THEN
        RETURN true;
    END IF;

    -- Check for global roles (most permissive)
    SELECT EXISTS (
        SELECT 1 FROM public.permissions
        WHERE supabase_id = user_uid
        AND (
            -- Global role
            role = required_level::TEXT
            -- Resource type role
            OR role = CONCAT(required_resource, '_', required_level::TEXT)
            -- Specific resource role
            OR role = CONCAT(required_resource, '_', required_id, '_', required_level::TEXT)
        )
    ) INTO role_exists;

    RETURN role_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for role access
-- Only allow access through has_permission() function
CREATE POLICY "Role viewers can view roles"
    ON public.permissions
    FOR SELECT
    TO authenticated
    USING (has_permission(auth.uid(), 'permission', supabase_id::text, 'viewer'::permission_level));

CREATE POLICY "Role editors can modify roles"
    ON public.permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (has_permission(auth.uid(), 'permission', supabase_id::text, 'editor'::permission_level));

CREATE POLICY "Role editors can update roles"
    ON public.permissions
    FOR UPDATE
    TO authenticated
    USING (has_permission(auth.uid(), 'permission', supabase_id::text, 'editor'::permission_level))
    WITH CHECK (has_permission(auth.uid(), 'permission', supabase_id::text, 'editor'::permission_level));

CREATE POLICY "Role managers can delete roles"
    ON public.permissions
    FOR DELETE
    TO authenticated
    USING (has_permission(auth.uid(), 'permission', supabase_id::text, 'manager'::permission_level));

-- Enable audit tracking
SELECT audit.enable_tracking('public.permissions');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.permissions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add default viewer role to all users
CREATE OR REPLACE FUNCTION add_default_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.permissions (supabase_id, role)
    VALUES (NEW.id, 'viewer');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_add_role
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION add_default_role();

-- Helper function to check permission level
CREATE OR REPLACE FUNCTION get_permission_level(role_name TEXT)
RETURNS permission_level AS $$
BEGIN
    RETURN CASE 
        WHEN role_name LIKE '%manager' THEN 'manager'::permission_level
        WHEN role_name LIKE '%editor' THEN 'editor'::permission_level
        ELSE 'viewer'::permission_level
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
