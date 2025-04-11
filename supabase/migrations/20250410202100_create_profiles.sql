-- Create secure custom types
-- Create enum for user status
CREATE TYPE user_status AS ENUM ('unverified', 'active', 'disabled');

CREATE DOMAIN phone_number AS TEXT
    CHECK (VALUE ~ '^\+?[1-9]\d{1,14}$'); -- Follows E.164 format

CREATE DOMAIN postal_code_type AS TEXT
    CHECK (VALUE ~ '^\d{5}(-\d{4})?$'); -- US postal code format

-- Create profiles table
CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY NOT NULL DEFAULT nanoid(),
    supabase_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone phone_number,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code postal_code_type,
    country TEXT DEFAULT 'US',
    -- Create enum type for user status
    status user_status DEFAULT 'unverified',
    last_sign_in TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = supabase_id);

-- Create a security invoker function to validate profile updates
CREATE OR REPLACE FUNCTION validate_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent modification of system-managed fields
    NEW.id = OLD.id;
    NEW.supabase_id = OLD.supabase_id;
    NEW.status = OLD.status;
    NEW.last_sign_in = OLD.last_sign_in;
    NEW.created_at = OLD.created_at;
    NEW.updated_at = OLD.updated_at;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to validate updates
CREATE TRIGGER validate_profile_update_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_profile_update();

-- Allow users to update only their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = supabase_id)
    WITH CHECK (auth.uid() = supabase_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = supabase_id);

-- Allow authenticated users to view basic info of active users
CREATE POLICY "Users can view basic info of active users"
    ON public.profiles
    FOR SELECT
    USING (
        -- Allow service role or authenticated users to view active profiles
        (auth.role() = 'service_role' OR auth.role() = 'authenticated')
        AND status = 'active'
        AND supabase_id != auth.uid()
    );

-- Allow editors and managers to view all profile info
CREATE POLICY "Editors and managers can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (
        -- Check if user has editor or manager permissions
        has_permission(auth.uid(), 'profile', id::text, 'editor'::permission_level)
        OR has_permission(auth.uid(), 'profile', id::text, 'manager'::permission_level)
    );

-- Create function to handle new user signup
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

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_profiles_supabase_id ON public.profiles(supabase_id);
CREATE INDEX idx_profiles_id ON public.profiles(id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Enable audit tracking
SELECT audit.enable_tracking('public.profiles');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
