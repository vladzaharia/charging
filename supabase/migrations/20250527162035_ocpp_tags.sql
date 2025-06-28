-- OCPP Tags table - minimal data for ID mapping and hierarchy
-- Using SteVe's id_tag as PK since it's already semi-randomized
CREATE TABLE IF NOT EXISTS public.ocpp_tags (
    id_tag text PRIMARY KEY,
    steve_tag_pk integer NOT NULL UNIQUE,
    parent_id_tag text REFERENCES public.ocpp_tags(id_tag) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Essential indexes for OCPP tags
CREATE INDEX IF NOT EXISTS idx_ocpp_tags_steve_pk ON public.ocpp_tags(steve_tag_pk);
CREATE INDEX IF NOT EXISTS idx_ocpp_tags_parent ON public.ocpp_tags(parent_id_tag);

-- Constraints for OCPP tags
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_ocpp_tags_id_tag_not_empty'
                   AND table_name = 'ocpp_tags') THEN
        ALTER TABLE public.ocpp_tags ADD CONSTRAINT check_ocpp_tags_id_tag_not_empty CHECK (length(id_tag) > 0);
    END IF;
END $$;

CREATE TRIGGER update_ocpp_tags_updated_at
    BEFORE UPDATE ON public.ocpp_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.ocpp_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for OCPP tags
SELECT create_viewer_policy('ocpp_tags');

CREATE POLICY "Managers can modify OCPP tags"
    ON public.ocpp_tags
    FOR ALL
    USING (
        (SELECT auth.role()) = 'service_role' OR
        has_permission((SELECT auth.uid()), 'system', 'ocpp_tags', 'manager'::permission_level)
    )
    WITH CHECK (
        (SELECT auth.role()) = 'service_role' OR
        has_permission((SELECT auth.uid()), 'system', 'ocpp_tags', 'manager'::permission_level)
    );

SELECT audit.enable_tracking('public.ocpp_tags');

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.ocpp_tags TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.ocpp_tags TO anon;
