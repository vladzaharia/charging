-- Role validation function
CREATE OR REPLACE FUNCTION is_valid_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF role_name IS NULL OR length(trim(role_name)) = 0 THEN
        RETURN FALSE;
    END IF;

    IF length(role_name) > 100 THEN
        RETURN FALSE;
    END IF;

    IF trim(role_name) != role_name THEN
        RETURN FALSE;
    END IF;

    IF role_name ~* '(select|insert|update|delete|drop|create|alter|exec|union|script|javascript|<|>|&|;|''|")' THEN
        RETURN FALSE;
    END IF;

    IF role_name ~ '[[:cntrl:]]' OR role_name ~ '[^a-zA-Z0-9_-]' THEN
        RETURN FALSE;
    END IF;

    RETURN role_name ~ '^[a-zA-Z0-9_-]+_(viewer|editor|manager)$' OR
           role_name IN ('viewer', 'editor', 'manager');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Permissions table
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (is_valid_role(role)),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID DEFAULT auth.uid(),
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(supabase_id, role)
);

-- Essential indexes for permissions table
CREATE INDEX idx_permissions_supabase_id ON public.permissions(supabase_id);
CREATE INDEX idx_permissions_role ON public.permissions(role);

-- Updated at trigger
CREATE TRIGGER update_permissions_updated_at
    BEFORE UPDATE ON public.permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Core permission check function
CREATE OR REPLACE FUNCTION has_permission(
    user_uid UUID,
    required_resource TEXT,
    required_id TEXT,
    required_level permission_level
)
RETURNS BOOLEAN AS $$
DECLARE
    role_exists BOOLEAN := FALSE;
    permission_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    IF user_uid IS NULL OR required_resource IS NULL OR required_level IS NULL THEN
        RETURN FALSE;
    END IF;

    IF NOT (required_resource ~ '^[a-zA-Z_][a-zA-Z0-9_]*$') THEN
        RETURN FALSE;
    END IF;

    IF length(required_resource) > 50 THEN
        RETURN FALSE;
    END IF;

    IF required_id IS NOT NULL THEN
        IF length(trim(required_id)) = 0 OR length(required_id) > 100 THEN
            RETURN FALSE;
        END IF;
        IF required_id ~* '(select|insert|update|delete|drop|create|alter|exec|union|script|<|>|&|;|''|")' THEN
            RETURN FALSE;
        END IF;
    END IF;

    IF (SELECT auth.role()) = 'service_role' THEN
        RETURN TRUE;
    END IF;

    required_hierarchy := CASE required_level
        WHEN 'viewer' THEN 1
        WHEN 'editor' THEN 2
        WHEN 'manager' THEN 3
        ELSE 0
    END;

    SELECT EXISTS (
        SELECT 1 FROM public.permissions p
        WHERE p.supabase_id = user_uid
        AND (
            (p.role IN ('viewer', 'editor', 'manager') AND
             CASE p.role
                WHEN 'viewer' THEN 1
                WHEN 'editor' THEN 2
                WHEN 'manager' THEN 3
                ELSE 0
             END >= required_hierarchy)
            OR (p.role ~ ('^' || required_resource || '_(viewer|editor|manager)$') AND
                CASE
                    WHEN p.role LIKE '%_viewer' THEN 1
                    WHEN p.role LIKE '%_editor' THEN 2
                    WHEN p.role LIKE '%_manager' THEN 3
                    ELSE 0
                END >= required_hierarchy)
            OR (required_id IS NOT NULL AND
                p.role ~ ('^' || required_resource || '_' || required_id || '_(viewer|editor|manager)$') AND
                CASE
                    WHEN p.role LIKE '%_viewer' THEN 1
                    WHEN p.role LIKE '%_editor' THEN 2
                    WHEN p.role LIKE '%_manager' THEN 3
                    ELSE 0
                END >= required_hierarchy)
        )
    ) INTO role_exists;

    RETURN role_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for permissions table
CREATE POLICY "Role viewers can view roles"
    ON public.permissions
    FOR SELECT
    TO authenticated
    USING (has_permission((SELECT auth.uid()), 'permission', supabase_id::text, 'viewer'::permission_level));

CREATE POLICY "Role editors can modify roles"
    ON public.permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (has_permission((SELECT auth.uid()), 'permission', supabase_id::text, 'editor'::permission_level));

CREATE POLICY "Role editors can update roles"
    ON public.permissions
    FOR UPDATE
    TO authenticated
    USING (has_permission((SELECT auth.uid()), 'permission', supabase_id::text, 'editor'::permission_level))
    WITH CHECK (has_permission((SELECT auth.uid()), 'permission', supabase_id::text, 'editor'::permission_level));

CREATE POLICY "Role managers can delete roles"
    ON public.permissions
    FOR DELETE
    TO authenticated
    USING (has_permission((SELECT auth.uid()), 'permission', supabase_id::text, 'manager'::permission_level));

-- Enable audit tracking for permissions
SELECT audit.enable_tracking('public.permissions');

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.permissions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Function to add default role for new users
CREATE OR REPLACE FUNCTION add_default_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.permissions (supabase_id, role)
    VALUES (NEW.id, 'viewer');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add default role for new users
CREATE TRIGGER on_auth_user_created_add_role
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION add_default_role();

-- Helper function to get permission level from role name
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

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID DEFAULT auth.uid())
RETURNS TABLE(role text, created_at timestamptz, created_by uuid) AS $$
BEGIN
    IF user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT p.role, p.created_at, p.created_by
    FROM public.permissions p
    WHERE p.supabase_id = user_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create standard user policies
CREATE OR REPLACE FUNCTION create_user_policy(
    table_name text,
    user_column text DEFAULT 'supabase_id'
)
RETURNS void AS $$
DECLARE
    policy_name text;
BEGIN
    IF table_name IS NULL OR length(trim(table_name)) = 0 THEN
        RAISE EXCEPTION 'table_name parameter cannot be NULL or empty';
    END IF;

    IF user_column IS NULL OR length(trim(user_column)) = 0 THEN
        RAISE EXCEPTION 'user_column parameter cannot be NULL or empty';
    END IF;

    IF NOT (table_name ~ '^[a-zA-Z_][a-zA-Z0-9_]*$') THEN
        RAISE EXCEPTION 'Invalid table name format: %', table_name;
    END IF;

    IF NOT (user_column ~ '^[a-zA-Z_][a-zA-Z0-9_]*$') THEN
        RAISE EXCEPTION 'Invalid column name format: %', user_column;
    END IF;

    policy_name := format('Users can view own %s', table_name);
    EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT USING ((SELECT auth.uid()) = %I)',
        policy_name, table_name, user_column
    );

    policy_name := format('Users can insert own %s', table_name);
    EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK ((SELECT auth.uid()) = %I)',
        policy_name, table_name, user_column
    );

    policy_name := format('Users can update own %s', table_name);
    EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE USING ((SELECT auth.uid()) = %I) WITH CHECK ((SELECT auth.uid()) = %I)',
        policy_name, table_name, user_column, user_column
    );

    RAISE NOTICE 'Created standard user policies for table %', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create manager policies
CREATE OR REPLACE FUNCTION create_manager_policy(
    table_name text,
    resource_type text,
    id_column text DEFAULT 'id'
)
RETURNS void AS $$
DECLARE
    policy_name text;
BEGIN
    IF table_name IS NULL OR resource_type IS NULL OR id_column IS NULL THEN
        RAISE EXCEPTION 'All parameters are required';
    END IF;

    IF NOT (table_name ~ '^[a-zA-Z_][a-zA-Z0-9_]*$') THEN
        RAISE EXCEPTION 'Invalid table name format: %', table_name;
    END IF;

    IF NOT (resource_type ~ '^[a-zA-Z_][a-zA-Z0-9_]*$') THEN
        RAISE EXCEPTION 'Invalid resource type format: %', resource_type;
    END IF;

    policy_name := format('Managers can modify %s', table_name);
    EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (
            (SELECT auth.role()) = ''service_role'' OR
            has_permission((SELECT auth.uid()), %L, %I, ''manager''::permission_level)
        ) WITH CHECK (
            (SELECT auth.role()) = ''service_role'' OR
            has_permission((SELECT auth.uid()), %L, %I, ''manager''::permission_level)
        )',
        policy_name, table_name, resource_type, id_column, resource_type, id_column
    );

    RAISE NOTICE 'Created manager policy for table %', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create viewer policies
CREATE OR REPLACE FUNCTION create_viewer_policy(
    table_name text,
    resource_type text DEFAULT NULL,
    id_column text DEFAULT 'id'
)
RETURNS void AS $$
DECLARE
    policy_name text;
BEGIN
    IF table_name IS NULL OR length(trim(table_name)) = 0 THEN
        RAISE EXCEPTION 'table_name parameter cannot be NULL or empty';
    END IF;

    IF NOT (table_name ~ '^[a-zA-Z_][a-zA-Z0-9_]*$') THEN
        RAISE EXCEPTION 'Invalid table name format: %', table_name;
    END IF;

    IF resource_type IS NULL THEN
        policy_name := format('All users can view %s', table_name);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT USING (true)',
            policy_name, table_name
        );
    ELSE
        policy_name := format('Viewers can view %s', table_name);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT USING (
                (SELECT auth.role()) = ''service_role'' OR
                has_permission((SELECT auth.uid()), %L, %I, ''viewer''::permission_level)
            )',
            policy_name, table_name, resource_type, id_column
        );
    END IF;

    RAISE NOTICE 'Created viewer policy for table %', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on all permission functions
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_policy(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_manager_policy(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_viewer_policy(text, text, text) TO authenticated;