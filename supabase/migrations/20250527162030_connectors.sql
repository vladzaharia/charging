CREATE TABLE IF NOT EXISTS public.connectors (
    id char(16) PRIMARY KEY DEFAULT nanoid(16, '123456789ABCDEFGHJKLMNPQRSTUVWXYZ'),
    charger_id char(8) NOT NULL REFERENCES public.chargers(id) ON DELETE CASCADE,
    connector_id integer NOT NULL,
    connector_idx integer NOT NULL,
    connector_type connector_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(charger_id, connector_idx),
    UNIQUE(charger_id, connector_id)
);

-- Essential indexes for connectors table
CREATE INDEX IF NOT EXISTS idx_connectors_charger_id ON public.connectors(charger_id);
CREATE INDEX IF NOT EXISTS idx_connectors_charger_type ON public.connectors(charger_id, connector_type);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_connectors_connector_idx_positive'
                   AND table_name = 'connectors') THEN
        ALTER TABLE public.connectors ADD CONSTRAINT check_connectors_connector_idx_positive CHECK (connector_idx > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_connectors_connector_id_positive'
                   AND table_name = 'connectors') THEN
        ALTER TABLE public.connectors ADD CONSTRAINT check_connectors_connector_id_positive CHECK (connector_id > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_connectors_id_length'
                   AND table_name = 'connectors') THEN
        ALTER TABLE public.connectors ADD CONSTRAINT check_connectors_id_length CHECK (length(id) > 0 AND length(id) <= 50);
    END IF;
END $$;

CREATE TRIGGER update_connectors_updated_at
    BEFORE UPDATE ON public.connectors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;

-- Create policies using helper functions
SELECT create_viewer_policy('connectors');

-- Custom policy for connectors (requires charger permission check)
CREATE POLICY "Managers can modify connectors"
    ON public.connectors
    FOR ALL
    USING (
        (SELECT auth.role()) = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.chargers
            WHERE chargers.id = connectors.charger_id
            AND has_permission((SELECT auth.uid()), 'charger', chargers.id, 'manager'::permission_level)
        )
    )
    WITH CHECK (
        (SELECT auth.role()) = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.chargers
            WHERE chargers.id = connectors.charger_id
            AND has_permission((SELECT auth.uid()), 'charger', chargers.id, 'manager'::permission_level)
        )
    );

SELECT audit.enable_tracking('public.connectors');

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.connectors TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.connectors TO anon;
