-- User-Tag Relationships Migration
-- Adds support for linking OCPP tags to users in the Polaris Express system

-- First, add tag_type enum to classify different types of OCPP tags
DO $$ BEGIN
    CREATE TYPE tag_type AS ENUM ('admin', 'physical', 'user', 'meta');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add tag_type column to ocpp_tags table
ALTER TABLE public.ocpp_tags 
ADD COLUMN IF NOT EXISTS tag_type tag_type;

-- Add function to automatically classify tag types based on patterns
CREATE OR REPLACE FUNCTION classify_tag_type(id_tag text)
RETURNS tag_type AS $$
BEGIN
    -- POLARIS-EXPRESS meta-tag
    IF id_tag = 'POLARIS-EXPRESS' THEN
        RETURN 'meta'::tag_type;
    -- OCPP-XXX pattern (admin/physical tags)
    ELSIF id_tag ~ '^OCPP-[A-Z0-9]+$' THEN
        RETURN 'physical'::tag_type;
    -- Nanoid pattern (user tags) - matches nanoid alphabet
    ELSIF id_tag ~ '^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$' 
          AND length(id_tag) >= 8 AND length(id_tag) <= 21 THEN
        RETURN 'user'::tag_type;
    -- Everything else is admin
    ELSE
        RETURN 'admin'::tag_type;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing tags with their types
UPDATE public.ocpp_tags 
SET tag_type = classify_tag_type(id_tag)
WHERE tag_type IS NULL;

-- Make tag_type NOT NULL with default classification
ALTER TABLE public.ocpp_tags 
ALTER COLUMN tag_type SET NOT NULL,
ALTER COLUMN tag_type SET DEFAULT 'admin'::tag_type;

-- Add trigger to automatically classify new tags
CREATE OR REPLACE FUNCTION auto_classify_tag_type()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tag_type IS NULL THEN
        NEW.tag_type = classify_tag_type(NEW.id_tag);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_classify_tag_type_trigger
    BEFORE INSERT OR UPDATE ON public.ocpp_tags
    FOR EACH ROW
    EXECUTE FUNCTION auto_classify_tag_type();

-- Create user_tag_links table for linking physical/meta tags to users
CREATE TABLE IF NOT EXISTS public.user_tag_links (
    id char(16) PRIMARY KEY DEFAULT nanoid(16, '123456789ABCDEFGHJKLMNPQRSTUVWXYZ'),
    user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tag_id text NOT NULL REFERENCES public.ocpp_tags(id_tag) ON DELETE CASCADE,
    linked_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
    link_reason text,
    is_active boolean NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, tag_id)
);

-- Add constraints to ensure only physical/meta tags can be linked to users
ALTER TABLE public.user_tag_links 
ADD CONSTRAINT check_linkable_tag_types 
CHECK (
    (SELECT tag_type FROM public.ocpp_tags WHERE id_tag = tag_id) 
    IN ('physical'::tag_type, 'meta'::tag_type)
);

-- Add constraint to prevent linking user tags (they're already user-specific)
ALTER TABLE public.user_tag_links 
ADD CONSTRAINT check_no_user_tag_linking 
CHECK (
    (SELECT tag_type FROM public.ocpp_tags WHERE id_tag = tag_id) 
    != 'user'::tag_type
);

-- Essential indexes for user_tag_links
CREATE INDEX IF NOT EXISTS idx_user_tag_links_user_id ON public.user_tag_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_links_tag_id ON public.user_tag_links(tag_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_links_active ON public.user_tag_links(is_active);
CREATE INDEX IF NOT EXISTS idx_user_tag_links_created_at ON public.user_tag_links(created_at);

-- Add index for tag_type on ocpp_tags
CREATE INDEX IF NOT EXISTS idx_ocpp_tags_tag_type ON public.ocpp_tags(tag_type);

-- Update trigger for user_tag_links
CREATE TRIGGER update_user_tag_links_updated_at
    BEFORE UPDATE ON public.user_tag_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for user_tag_links
ALTER TABLE public.user_tag_links ENABLE ROW LEVEL SECURITY;

-- Create policies for user_tag_links
SELECT create_viewer_policy('user_tag_links');

-- Policy for users to see their own tag links
CREATE POLICY "Users can view their own tag links"
    ON public.user_tag_links
    FOR SELECT
    USING (
        (SELECT auth.role()) = 'service_role' OR
        user_id = (SELECT id FROM public.profiles WHERE supabase_id = (SELECT auth.uid()))
    );

-- Policy for managers to manage tag links
CREATE POLICY "Managers can manage tag links"
    ON public.user_tag_links
    FOR ALL
    USING (
        (SELECT auth.role()) = 'service_role' OR
        has_permission((SELECT auth.uid()), 'system', 'user_tag_links', 'manager'::permission_level)
    )
    WITH CHECK (
        (SELECT auth.role()) = 'service_role' OR
        has_permission((SELECT auth.uid()), 'system', 'user_tag_links', 'manager'::permission_level)
    );

-- Enable audit tracking
SELECT audit.enable_tracking('public.user_tag_links');

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_tag_links TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.user_tag_links TO anon;

-- Add helpful views for common queries
CREATE OR REPLACE VIEW public.user_tags_view AS
SELECT 
    utl.id as link_id,
    utl.user_id,
    p.first_name,
    p.last_name,
    p.email,
    utl.tag_id,
    ot.tag_type,
    ot.steve_tag_pk,
    ot.parent_id_tag,
    utl.linked_by,
    utl.link_reason,
    utl.is_active,
    utl.created_at as linked_at,
    utl.updated_at
FROM public.user_tag_links utl
JOIN public.profiles p ON utl.user_id = p.id
JOIN public.ocpp_tags ot ON utl.tag_id = ot.id_tag
WHERE utl.is_active = true;

-- View for tag usage by users
CREATE OR REPLACE VIEW public.tag_users_view AS
SELECT 
    ot.id_tag,
    ot.tag_type,
    ot.steve_tag_pk,
    ot.parent_id_tag,
    COUNT(utl.user_id) as linked_user_count,
    ARRAY_AGG(
        CASE WHEN utl.is_active THEN 
            json_build_object(
                'user_id', utl.user_id,
                'name', p.first_name || ' ' || p.last_name,
                'email', p.email,
                'linked_at', utl.created_at
            )
        END
    ) FILTER (WHERE utl.is_active) as linked_users
FROM public.ocpp_tags ot
LEFT JOIN public.user_tag_links utl ON ot.id_tag = utl.tag_id AND utl.is_active = true
LEFT JOIN public.profiles p ON utl.user_id = p.id
GROUP BY ot.id_tag, ot.tag_type, ot.steve_tag_pk, ot.parent_id_tag;

-- Grant permissions on views
GRANT SELECT ON public.user_tags_view TO authenticated, anon;
GRANT SELECT ON public.tag_users_view TO authenticated, anon;

-- Add comments for documentation
COMMENT ON TABLE public.user_tag_links IS 'Links physical and meta OCPP tags to users for authorization';
COMMENT ON COLUMN public.ocpp_tags.tag_type IS 'Classification: admin, physical, user, meta';
COMMENT ON FUNCTION classify_tag_type(text) IS 'Automatically classifies OCPP tags based on naming patterns';
COMMENT ON VIEW public.user_tags_view IS 'Active user-tag relationships with user details';
COMMENT ON VIEW public.tag_users_view IS 'Tag usage summary with linked users';
