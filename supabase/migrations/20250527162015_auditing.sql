-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Function to validate table exists and get metadata
CREATE OR REPLACE FUNCTION audit.get_table_metadata(target_table regclass)
RETURNS TABLE(schema_name text, table_name text, pk_column text) AS $$
DECLARE
    _schema_name text;
    _table_name text;
    _pk_column text;
BEGIN
    IF target_table IS NULL THEN
        RAISE EXCEPTION 'target_table parameter cannot be NULL';
    END IF;

    -- Extract schema and table names
    SELECT n.nspname, c.relname INTO _schema_name, _table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.oid = target_table;

    IF _schema_name IS NULL OR _table_name IS NULL THEN
        RAISE EXCEPTION 'Table % does not exist or is not accessible', target_table;
    END IF;

    -- Prevent audit tracking on system schemas
    IF _schema_name IN ('information_schema', 'pg_catalog', 'pg_toast') THEN
        RAISE EXCEPTION 'Cannot enable audit tracking on system schema: %', _schema_name;
    END IF;

    IF NOT (_table_name ~ '^[a-zA-Z_][a-zA-Z0-9_]*$') THEN
        RAISE EXCEPTION 'Invalid table name format: %', _table_name;
    END IF;

    -- Get primary key column (only single column primary keys supported)
    SELECT a.attname INTO _pk_column
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = target_table AND i.indisprimary AND array_length(i.indkey, 1) = 1;

    IF _pk_column IS NULL THEN
        RAISE EXCEPTION 'Table % must have a single-column primary key for audit tracking', target_table;
    END IF;

    IF NOT (_pk_column ~ '^[a-zA-Z_][a-zA-Z0-9_]*$') THEN
        RAISE EXCEPTION 'Invalid primary key column name format: %', _pk_column;
    END IF;

    RETURN QUERY SELECT _schema_name, _table_name, _pk_column;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Skip if table is in audit schema
CREATE OR REPLACE FUNCTION audit.skip_audit_table(target_table regclass)
RETURNS boolean AS $$
DECLARE
    table_schema text;
BEGIN
    SELECT n.nspname INTO table_schema
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.oid = target_table;

    RETURN table_schema = 'audit';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create the audit trigger for a table
CREATE OR REPLACE FUNCTION audit.enable_tracking(target_table regclass)
    RETURNS void AS $$
DECLARE
    table_meta record;
    audit_table_name text;
    trigger_name text;
    trigger_function_name text;
BEGIN
    -- Skip if table is in audit schema
    IF audit.skip_audit_table(target_table) THEN
        RETURN;
    END IF;

    -- Get table metadata
    SELECT * INTO table_meta FROM audit.get_table_metadata(target_table);

    -- Create audit table
    audit_table_name := table_meta.table_name;
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS audit.%I (
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            record_id text NOT NULL,
            operation text NOT NULL CHECK (operation IN (''INSERT'', ''UPDATE'', ''DELETE'')),
            old_data jsonb,
            new_data jsonb,
            changed_by uuid DEFAULT auth.uid(),
            changed_at timestamptz DEFAULT now() NOT NULL,
            CONSTRAINT audit_%I_operation_check CHECK (
                (operation = ''INSERT'' AND old_data IS NULL AND new_data IS NOT NULL) OR
                (operation = ''UPDATE'' AND old_data IS NOT NULL AND new_data IS NOT NULL) OR
                (operation = ''DELETE'' AND old_data IS NOT NULL AND new_data IS NULL)
            )
        )',
        audit_table_name,
        audit_table_name
    );

    -- Create indexes for the audit table
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_audit_%I_record_id ON audit.%I(record_id)',
        audit_table_name, audit_table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_audit_%I_changed_at ON audit.%I(changed_at DESC)',
        audit_table_name, audit_table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_audit_%I_operation ON audit.%I(operation)',
        audit_table_name, audit_table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_audit_%I_record_operation ON audit.%I(record_id, operation)',
        audit_table_name, audit_table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_audit_%I_changed_at_operation ON audit.%I(changed_at DESC, operation)',
        audit_table_name, audit_table_name);

    -- Create trigger function
    trigger_function_name := format('audit_trigger_%s', table_meta.table_name);
    EXECUTE format(
        'CREATE OR REPLACE FUNCTION audit.%I()
        RETURNS trigger AS $trigger$
        DECLARE
            old_jsonb jsonb;
            new_jsonb jsonb;
        BEGIN
            IF TG_OP = ''INSERT'' THEN
                new_jsonb := to_jsonb(NEW);
                INSERT INTO audit.%I (
                    record_id,
                    operation,
                    new_data
                ) VALUES (
                    NEW.%I::text,
                    TG_OP,
                    new_jsonb
                );
                RETURN NEW;
            ELSIF TG_OP = ''UPDATE'' THEN
                -- Exclude updated_at from comparison
                old_jsonb := to_jsonb(OLD) - ''updated_at'';
                new_jsonb := to_jsonb(NEW) - ''updated_at'';

                -- Only log if meaningful data actually changed
                IF old_jsonb IS DISTINCT FROM new_jsonb THEN
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
                END IF;
                RETURN NEW;
            ELSIF TG_OP = ''DELETE'' THEN
                old_jsonb := to_jsonb(OLD);
                INSERT INTO audit.%I (
                    record_id,
                    operation,
                    old_data
                ) VALUES (
                    OLD.%I::text,
                    TG_OP,
                    old_jsonb
                );
                RETURN OLD;
            END IF;
            RETURN NULL;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING ''Audit trigger failed for operation %%, record %%, error: %%'',
                    TG_OP,
                    COALESCE(NEW.%I::text, OLD.%I::text, ''unknown''),
                    SQLERRM;
                RETURN CASE TG_OP
                    WHEN ''DELETE'' THEN OLD
                    ELSE NEW
                END;
        END;
        $trigger$ LANGUAGE plpgsql SECURITY DEFINER;',
        trigger_function_name,
        audit_table_name,
        table_meta.pk_column,
        audit_table_name,
        table_meta.pk_column,
        audit_table_name,
        table_meta.pk_column,
        table_meta.pk_column,
        table_meta.pk_column
    );

    -- Create trigger
    trigger_name := format('audit_trigger_%s', table_meta.table_name);
    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON %I.%I;
         CREATE TRIGGER %I
         AFTER INSERT OR UPDATE OR DELETE ON %I.%I
         FOR EACH ROW EXECUTE FUNCTION audit.%I();',
        trigger_name, table_meta.schema_name, table_meta.table_name,
        trigger_name, table_meta.schema_name, table_meta.table_name,
        trigger_function_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable audit tracking for a table
CREATE OR REPLACE FUNCTION audit.disable_tracking(target_table regclass)
RETURNS void AS $$
DECLARE
    table_meta record;
    trigger_name text;
    trigger_function_name text;
BEGIN
    -- Get table metadata
    SELECT * INTO table_meta FROM audit.get_table_metadata(target_table);

    -- Drop trigger
    trigger_name := format('audit_trigger_%s', table_meta.table_name);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I;',
        trigger_name, table_meta.schema_name, table_meta.table_name);

    -- Drop trigger function
    trigger_function_name := format('audit_trigger_%s', table_meta.table_name);
    EXECUTE format('DROP FUNCTION IF EXISTS audit.%I();', trigger_function_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to temporarily disable audit tracking
CREATE OR REPLACE FUNCTION audit.disable_tracking_temporarily(target_table regclass)
RETURNS void AS $$
DECLARE
    table_meta record;
    trigger_name text;
BEGIN
    SELECT * INTO table_meta FROM audit.get_table_metadata(target_table);

    trigger_name := format('audit_trigger_%s', table_meta.table_name);
    EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I',
        table_meta.schema_name, table_meta.table_name, trigger_name);

    RAISE NOTICE 'Audit tracking temporarily disabled for table %.%',
        table_meta.schema_name, table_meta.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to re-enable audit tracking
CREATE OR REPLACE FUNCTION audit.enable_tracking_after_batch(target_table regclass)
RETURNS void AS $$
DECLARE
    table_meta record;
    trigger_name text;
BEGIN
    SELECT * INTO table_meta FROM audit.get_table_metadata(target_table);

    trigger_name := format('audit_trigger_%s', table_meta.table_name);
    EXECUTE format('ALTER TABLE %I.%I ENABLE TRIGGER %I',
        table_meta.schema_name, table_meta.table_name, trigger_name);

    RAISE NOTICE 'Audit tracking re-enabled for table %.%',
        table_meta.schema_name, table_meta.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audit records
CREATE OR REPLACE FUNCTION audit.cleanup_old_records(
    table_name text,
    days_to_keep integer DEFAULT 365
)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
    sanitized_table_name text;
BEGIN
    IF table_name IS NULL OR length(trim(table_name)) = 0 THEN
        RAISE EXCEPTION 'table_name parameter cannot be NULL or empty';
    END IF;

    IF days_to_keep IS NULL OR days_to_keep <= 0 THEN
        RAISE EXCEPTION 'days_to_keep must be a positive integer, got: %', days_to_keep;
    END IF;

    IF days_to_keep > 3650 THEN -- 10 years max
        RAISE EXCEPTION 'days_to_keep cannot exceed 3650 days (10 years), got: %', days_to_keep;
    END IF;

    sanitized_table_name := trim(table_name);
    IF NOT (sanitized_table_name ~ '^[a-zA-Z_][a-zA-Z0-9_]*$') THEN
        RAISE EXCEPTION 'Invalid table name format: %. Only alphanumeric characters and underscores allowed', sanitized_table_name;
    END IF;

    IF length(sanitized_table_name) > 63 THEN -- PostgreSQL identifier limit
        RAISE EXCEPTION 'Table name too long: % (max 63 characters)', sanitized_table_name;
    END IF;

    -- Verify the audit table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'audit' AND table_name = sanitized_table_name
    ) THEN
        RAISE EXCEPTION 'Audit table audit.% does not exist', sanitized_table_name;
    END IF;

    EXECUTE format(
        'DELETE FROM audit.%I WHERE changed_at < now() - interval ''%s days''',
        sanitized_table_name,
        days_to_keep
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RAISE NOTICE 'Cleaned up % old audit records from table audit.% (older than % days)',
        deleted_count, sanitized_table_name, days_to_keep;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for audit data archiving
CREATE OR REPLACE FUNCTION audit.archive_old_records(
    table_name text,
    days_to_keep integer DEFAULT 365,
    archive_table_suffix text DEFAULT '_archive'
)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
    sanitized_table_name text;
    archive_table_name text;
BEGIN
    IF table_name IS NULL OR length(trim(table_name)) = 0 THEN
        RAISE EXCEPTION 'table_name parameter cannot be NULL or empty';
    END IF;

    IF days_to_keep IS NULL OR days_to_keep <= 0 THEN
        RAISE EXCEPTION 'days_to_keep must be a positive integer, got: %', days_to_keep;
    END IF;

    sanitized_table_name := trim(table_name);
    IF NOT (sanitized_table_name ~ '^[a-zA-Z_][a-zA-Z0-9_]*$') THEN
        RAISE EXCEPTION 'Invalid table name format: %', sanitized_table_name;
    END IF;

    archive_table_name := sanitized_table_name || archive_table_suffix;

    -- Create archive table if it doesn't exist
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS audit.%I (LIKE audit.%I INCLUDING ALL)',
        archive_table_name,
        sanitized_table_name
    );

    -- Move old records to archive table
    EXECUTE format(
        'WITH moved_records AS (
            DELETE FROM audit.%I
            WHERE changed_at < now() - interval ''%s days''
            RETURNING *
        )
        INSERT INTO audit.%I SELECT * FROM moved_records',
        sanitized_table_name,
        days_to_keep,
        archive_table_name
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RAISE NOTICE 'Archived % old audit records from table audit.% to audit.% (older than % days)',
        deleted_count, sanitized_table_name, archive_table_name, days_to_keep;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to monitor audit table sizes
CREATE OR REPLACE FUNCTION audit.get_audit_stats()
RETURNS TABLE(
    table_name text,
    record_count bigint,
    table_size text,
    index_size text,
    total_size text,
    oldest_record timestamptz,
    newest_record timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::text,
        (SELECT count(*) FROM information_schema.tables ist
         WHERE ist.table_schema = 'audit' AND ist.table_name = t.table_name)::bigint as record_count,
        pg_size_pretty(pg_total_relation_size(('audit.' || t.table_name)::regclass)) as table_size,
        pg_size_pretty(pg_indexes_size(('audit.' || t.table_name)::regclass)) as index_size,
        pg_size_pretty(pg_total_relation_size(('audit.' || t.table_name)::regclass) +
                      pg_indexes_size(('audit.' || t.table_name)::regclass)) as total_size,
        (SELECT min(changed_at) FROM information_schema.tables ist
         WHERE ist.table_schema = 'audit' AND ist.table_name = t.table_name) as oldest_record,
        (SELECT max(changed_at) FROM information_schema.tables ist
         WHERE ist.table_schema = 'audit' AND ist.table_name = t.table_name) as newest_record
    FROM information_schema.tables t
    WHERE t.table_schema = 'audit'
    AND t.table_name NOT LIKE '%_archive'
    ORDER BY pg_total_relation_size(('audit.' || t.table_name)::regclass) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate audit system integrity
CREATE OR REPLACE FUNCTION audit.validate_audit_integrity()
RETURNS TABLE(
    table_name text,
    issue_type text,
    issue_description text,
    severity text
) AS $$
BEGIN
    -- Check for audit tables without corresponding main tables
    RETURN QUERY
    SELECT
        t.table_name::text,
        'orphaned_audit_table'::text,
        'Audit table exists but main table does not'::text,
        'WARNING'::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'audit'
    AND t.table_name NOT LIKE '%_archive'
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables mt
        WHERE mt.table_schema = 'public'
        AND mt.table_name = t.table_name
    );

    -- Check for main tables without audit tracking
    RETURN QUERY
    SELECT
        t.table_name::text,
        'missing_audit_tracking'::text,
        'Main table exists but has no audit tracking'::text,
        'INFO'::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables at
        WHERE at.table_schema = 'audit'
        AND at.table_name = t.table_name
    );

    -- Check for audit tables with no recent activity
    RETURN QUERY
    SELECT
        t.table_name::text,
        'no_recent_activity'::text,
        format('No audit records in the last 30 days')::text,
        'INFO'::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'audit'
    AND t.table_name NOT LIKE '%_archive'
    AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'audit'
        AND c.table_name = t.table_name
        AND c.column_name = 'changed_at'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure the audit schema
REVOKE ALL ON SCHEMA audit FROM PUBLIC;
GRANT USAGE ON SCHEMA audit TO PUBLIC;  -- Needed for trigger function execution
REVOKE ALL ON ALL TABLES IN SCHEMA audit FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit REVOKE ALL ON TABLES FROM PUBLIC;

-- Grant specific permissions for audit functions
GRANT EXECUTE ON FUNCTION audit.enable_tracking(regclass) TO authenticated;
GRANT EXECUTE ON FUNCTION audit.disable_tracking(regclass) TO authenticated;
GRANT EXECUTE ON FUNCTION audit.disable_tracking_temporarily(regclass) TO authenticated;
GRANT EXECUTE ON FUNCTION audit.enable_tracking_after_batch(regclass) TO authenticated;
GRANT EXECUTE ON FUNCTION audit.cleanup_old_records(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION audit.archive_old_records(text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION audit.get_audit_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION audit.validate_audit_integrity() TO authenticated;