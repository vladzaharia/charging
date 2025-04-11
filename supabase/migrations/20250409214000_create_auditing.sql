-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;



-- Function to create the audit trigger for a table
CREATE OR REPLACE FUNCTION audit.enable_tracking(target_table regclass)
    RETURNS void AS $$
DECLARE
    table_name text;
    schema_name text;
    audit_table_name text;
    trigger_name text;
    trigger_function_name text;
    pk_column text;
BEGIN
    -- Skip if table is in audit schema
    IF audit.skip_audit_table(target_table) THEN
        RETURN;
    END IF;

    -- Extract schema and table names
    SELECT n.nspname, c.relname INTO schema_name, table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.oid = target_table;

    -- Get primary key column
    SELECT a.attname INTO pk_column
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = target_table AND i.indisprimary;

    -- Create audit table
    audit_table_name := table_name;
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS audit.%I (
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            record_id text NOT NULL,
            operation text NOT NULL CHECK (operation IN (''INSERT'', ''UPDATE'', ''DELETE'')),
            old_data jsonb,
            new_data jsonb,
            changed_by text DEFAULT auth.uid(),
            changed_at timestamptz DEFAULT now()
        )', 
        audit_table_name
    );

    -- Create trigger function
    trigger_function_name := format('audit_trigger_%s', table_name);
    EXECUTE format(
        'CREATE OR REPLACE FUNCTION audit.%I() 
        RETURNS trigger AS $trigger$
        BEGIN
            IF TG_OP = ''INSERT'' THEN
                INSERT INTO audit.%I (
                    record_id,
                    operation,
                    new_data
                ) VALUES (
                    NEW.%I::text,
                    TG_OP,
                    to_jsonb(NEW)
                );
                RETURN NEW;
            ELSIF TG_OP = ''UPDATE'' THEN
                INSERT INTO audit.%I (
                    record_id,
                    operation,
                    old_data,
                    new_data
                ) VALUES (
                    NEW.%I::text,
                    TG_OP,
                    to_jsonb(OLD),
                    to_jsonb(NEW)
                );
                RETURN NEW;
            ELSIF TG_OP = ''DELETE'' THEN
                INSERT INTO audit.%I (
                    record_id,
                    operation,
                    old_data
                ) VALUES (
                    OLD.%I::text,
                    TG_OP,
                    to_jsonb(OLD)
                );
                RETURN OLD;
            END IF;
            RETURN NULL;
        END;
        $trigger$ LANGUAGE plpgsql SECURITY DEFINER;',
        trigger_function_name,
        audit_table_name,
        pk_column,
        audit_table_name,
        pk_column,
        audit_table_name,
        pk_column
    );

    -- Create trigger
    trigger_name := format('audit_trigger_%s', table_name);
    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON %I.%I;
         CREATE TRIGGER %I
         AFTER INSERT OR UPDATE OR DELETE ON %I.%I
         FOR EACH ROW EXECUTE FUNCTION audit.%I();',
        trigger_name, schema_name, table_name,
        trigger_name, schema_name, table_name,
        trigger_function_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Skip if table is in audit schema
CREATE OR REPLACE FUNCTION audit.skip_audit_table(target_table regclass)
RETURNS boolean AS $$
BEGIN
    RETURN (SELECT schemaname FROM pg_tables WHERE tablename = target_table::text) = 'audit';
END;
$$ LANGUAGE plpgsql;

-- Revoke access to audit schema but maintain minimum required permissions for triggers
REVOKE ALL ON SCHEMA audit FROM PUBLIC;
GRANT USAGE ON SCHEMA audit TO PUBLIC;  -- Needed for trigger function execution
REVOKE ALL ON ALL TABLES IN SCHEMA audit FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit REVOKE ALL ON TABLES FROM PUBLIC;

-- Note: To enable auditing for a table, call:
-- SELECT audit.enable_tracking('schema_name.table_name');
--
-- Example:
-- SELECT audit.enable_tracking('public.users');
