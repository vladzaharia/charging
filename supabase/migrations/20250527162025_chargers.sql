CREATE TABLE IF NOT EXISTS public.chargers (
    id char(8) PRIMARY KEY DEFAULT nanoid(8, '123456789ABCDEFGHJKLMNPQRSTUVWXYZ'),
    charge_box_id text NOT NULL UNIQUE,
    charge_box_pk integer,
    name text,
    location text,
    is_hidden boolean NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Essential indexes for chargers table
CREATE INDEX IF NOT EXISTS idx_chargers_charge_box_id ON public.chargers(charge_box_id);
CREATE INDEX IF NOT EXISTS idx_chargers_charge_box_id_hidden ON public.chargers(charge_box_id, is_hidden);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_chargers_charge_box_id_not_empty'
                   AND table_name = 'chargers') THEN
        ALTER TABLE public.chargers ADD CONSTRAINT check_chargers_charge_box_id_not_empty CHECK (length(trim(charge_box_id)) > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_chargers_charge_box_pk_positive'
                   AND table_name = 'chargers') THEN
        ALTER TABLE public.chargers ADD CONSTRAINT check_chargers_charge_box_pk_positive CHECK (charge_box_pk IS NULL OR charge_box_pk > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_chargers_id_length'
                   AND table_name = 'chargers') THEN
        ALTER TABLE public.chargers ADD CONSTRAINT check_chargers_id_length CHECK (length(id) > 0 AND length(id) <= 50);
    END IF;
END $$;

CREATE TRIGGER update_chargers_updated_at
    BEFORE UPDATE ON public.chargers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.chargers ENABLE ROW LEVEL SECURITY;

-- Create policies using helper functions
SELECT create_viewer_policy('chargers');
SELECT create_manager_policy('chargers', 'charger', 'id');

SELECT audit.enable_tracking('public.chargers');

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.chargers TO anon;
GRANT ALL ON public.chargers TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
