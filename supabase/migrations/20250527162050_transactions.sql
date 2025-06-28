-- Transactions table for billing and privacy
-- Uses separate ID to hide SteVe's sequential transaction IDs
CREATE TABLE IF NOT EXISTS public.transactions (
    id char(16) PRIMARY KEY DEFAULT nanoid(16, '123456789ABCDEFGHJKLMNPQRSTUVWXYZ'),
    steve_transaction_id integer NOT NULL UNIQUE,
    charger_id char(8) NOT NULL REFERENCES public.chargers(id) ON DELETE CASCADE,
    connector_id char(16) NOT NULL REFERENCES public.connectors(id) ON DELETE CASCADE,
    ocpp_tag_id text NOT NULL REFERENCES public.ocpp_tags(id_tag) ON DELETE CASCADE,
    start_timestamp TIMESTAMPTZ NOT NULL,
    start_meter_value bigint NOT NULL,
    stop_timestamp TIMESTAMPTZ,
    stop_meter_value bigint,
    energy_consumed_wh bigint GENERATED ALWAYS AS (
        CASE
            WHEN stop_meter_value IS NOT NULL AND stop_meter_value >= start_meter_value
            THEN stop_meter_value - start_meter_value
            ELSE NULL
        END
    ) STORED,
    duration_minutes integer GENERATED ALWAYS AS (
        CASE
            WHEN stop_timestamp IS NOT NULL
            THEN EXTRACT(EPOCH FROM (stop_timestamp - start_timestamp)) / 60
            ELSE NULL
        END
    ) STORED,
    is_active boolean GENERATED ALWAYS AS (stop_timestamp IS NULL) STORED,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Essential indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_steve_id ON public.transactions(steve_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_charger ON public.transactions(charger_id);
CREATE INDEX IF NOT EXISTS idx_transactions_connector ON public.transactions(connector_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tag ON public.transactions(ocpp_tag_id);
CREATE INDEX IF NOT EXISTS idx_transactions_active ON public.transactions(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_start_time ON public.transactions(start_timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_billing ON public.transactions(charger_id, start_timestamp, energy_consumed_wh);

-- Constraints for transactions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_transactions_meter_values_positive'
                   AND table_name = 'transactions') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT check_transactions_meter_values_positive 
        CHECK (start_meter_value >= 0 AND (stop_meter_value IS NULL OR stop_meter_value >= 0));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_transactions_stop_after_start'
                   AND table_name = 'transactions') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT check_transactions_stop_after_start 
        CHECK (stop_timestamp IS NULL OR stop_timestamp >= start_timestamp);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_transactions_stop_meter_gte_start'
                   AND table_name = 'transactions') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT check_transactions_stop_meter_gte_start 
        CHECK (stop_meter_value IS NULL OR stop_meter_value >= start_meter_value);
    END IF;
END $$;

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
SELECT create_viewer_policy('transactions');

CREATE POLICY "Managers can modify transactions"
    ON public.transactions
    FOR ALL
    USING (
        (SELECT auth.role()) = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.chargers
            WHERE chargers.id = transactions.charger_id
            AND has_permission((SELECT auth.uid()), 'charger', chargers.id, 'manager'::permission_level)
        )
    )
    WITH CHECK (
        (SELECT auth.role()) = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.chargers
            WHERE chargers.id = transactions.charger_id
            AND has_permission((SELECT auth.uid()), 'charger', chargers.id, 'manager'::permission_level)
        )
    );

SELECT audit.enable_tracking('public.transactions');

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.transactions TO anon;
