CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY NOT NULL DEFAULT nanoid(),
    supabase_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    first_name TEXT NOT NULL CHECK (length(trim(first_name)) > 0),
    last_name TEXT NOT NULL CHECK (length(trim(last_name)) > 0),
    email TEXT NOT NULL CHECK (length(trim(email)) > 0),
    phone phone_number,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code postal_code_type,
    country TEXT DEFAULT 'US' CHECK (length(country) = 2),
    status user_status DEFAULT 'unverified' NOT NULL,
    last_sign_in TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT check_profiles_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT check_profiles_names_length CHECK (
        length(first_name) <= 50 AND length(last_name) <= 50
    ),
    CONSTRAINT check_profiles_id_length CHECK (length(id) > 0 AND length(id) <= 50),
    CONSTRAINT check_profiles_country_format CHECK (country ~ '^[A-Z]{2}$')
);

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create standard user policies for profiles
SELECT create_user_policy('profiles', 'supabase_id');
CREATE OR REPLACE FUNCTION validate_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.first_name IS NULL OR length(trim(NEW.first_name)) = 0 THEN
        RAISE EXCEPTION 'First name cannot be null or empty';
    END IF;

    IF NEW.last_name IS NULL OR length(trim(NEW.last_name)) = 0 THEN
        RAISE EXCEPTION 'Last name cannot be null or empty';
    END IF;

    IF NEW.email IS NULL OR length(trim(NEW.email)) = 0 THEN
        RAISE EXCEPTION 'Email cannot be null or empty';
    END IF;

    IF NEW.first_name ~* '(<script|javascript:|data:|vbscript:|on\w+\s*=)' THEN
        RAISE EXCEPTION 'Invalid characters in first name';
    END IF;

    IF NEW.last_name ~* '(<script|javascript:|data:|vbscript:|on\w+\s*=)' THEN
        RAISE EXCEPTION 'Invalid characters in last name';
    END IF;

    IF NEW.address_line1 IS NOT NULL AND length(NEW.address_line1) > 100 THEN
        RAISE EXCEPTION 'Address line 1 too long (max 100 characters)';
    END IF;

    IF NEW.address_line2 IS NOT NULL AND length(NEW.address_line2) > 100 THEN
        RAISE EXCEPTION 'Address line 2 too long (max 100 characters)';
    END IF;

    IF NEW.city IS NOT NULL AND length(NEW.city) > 50 THEN
        RAISE EXCEPTION 'City name too long (max 50 characters)';
    END IF;

    IF NEW.state IS NOT NULL AND length(NEW.state) > 50 THEN
        RAISE EXCEPTION 'State name too long (max 50 characters)';
    END IF;

    IF (SELECT auth.role()) != 'service_role' THEN
        NEW.id = OLD.id;
        NEW.supabase_id = OLD.supabase_id;
        NEW.created_at = OLD.created_at;

        IF NOT has_permission((SELECT auth.uid()), 'profile', OLD.id, 'manager'::permission_level) THEN
            NEW.status = OLD.status;
            NEW.last_sign_in = OLD.last_sign_in;
        END IF;
    END IF;

    NEW.updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_profile_update_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_profile_update();

-- Additional policy for viewing active users (business requirement)
CREATE POLICY "Users can view basic info of active users"
    ON public.profiles
    FOR SELECT
    USING (
        ((SELECT auth.role()) = 'service_role' OR (SELECT auth.role()) = 'authenticated')
        AND status = 'active'
        AND supabase_id != (SELECT auth.uid())
    );

-- Create viewer policy for profile management
SELECT create_viewer_policy('profiles', 'profile', 'id');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (supabase_id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Essential indexes for profiles table
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_status ON public.profiles(status);

SELECT audit.enable_tracking('public.profiles');

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
