-- Seed data for user-tag relationships
-- Adds POLARIS-EXPRESS meta-tag and sample user-tag links

-- Insert POLARIS-EXPRESS meta-tag (this will hold all nanoid user tags)
INSERT INTO public.ocpp_tags (id_tag, steve_tag_pk, parent_id_tag, tag_type) VALUES
('POLARIS-EXPRESS', 999999, NULL, 'meta')
ON CONFLICT (id_tag) DO UPDATE SET
    steve_tag_pk = EXCLUDED.steve_tag_pk,
    tag_type = EXCLUDED.tag_type,
    updated_at = now();

-- Create sample nanoid user tags under POLARIS-EXPRESS
-- These represent individual users in the Polaris Express system
INSERT INTO public.ocpp_tags (id_tag, steve_tag_pk, parent_id_tag, tag_type) VALUES
-- Sample user nanoid tags (these would be generated for each user)
('K2N8P9R3', 1000001, 'POLARIS-EXPRESS', 'user'),
('M7Q4T6W9', 1000002, 'POLARIS-EXPRESS', 'user'),
('H5J8L2N6', 1000003, 'POLARIS-EXPRESS', 'user'),
('P3R7S9V4', 1000004, 'POLARIS-EXPRESS', 'user'),
('B8D2F5G9', 1000005, 'POLARIS-EXPRESS', 'user')
ON CONFLICT (id_tag) DO UPDATE SET
    steve_tag_pk = EXCLUDED.steve_tag_pk,
    parent_id_tag = EXCLUDED.parent_id_tag,
    tag_type = EXCLUDED.tag_type,
    updated_at = now();

-- Update existing tags to ensure they have correct classifications
UPDATE public.ocpp_tags 
SET tag_type = classify_tag_type(id_tag)
WHERE tag_type IS NULL OR tag_type = 'admin';

-- Sample user-tag links (linking physical tags to users)
-- Note: This assumes we have users in the profiles table
-- In production, these would be created through the admin API

-- First, let's create some sample users if they don't exist
INSERT INTO public.profiles (id, supabase_id, first_name, last_name, email, status) VALUES
('USER001', gen_random_uuid(), 'John', 'Doe', 'john.doe@example.com', 'active'),
('USER002', gen_random_uuid(), 'Jane', 'Smith', 'jane.smith@example.com', 'active'),
('USER003', gen_random_uuid(), 'Bob', 'Johnson', 'bob.johnson@example.com', 'active')
ON CONFLICT (id) DO NOTHING;

-- Link physical OCPP tags to users
-- This allows physical tags to be used by specific users
INSERT INTO public.user_tag_links (user_id, tag_id, linked_by, link_reason, is_active) VALUES
-- Link OCPP-VLAD physical tags to USER001
('USER001', 'OCPP-VLAD', 'USER001', 'Primary user assignment', true),
('USER001', '048CBACA551390', 'USER001', 'Physical card assignment', true),
('USER001', '04FB5301C12A81', 'USER001', 'Backup physical card', true),

-- Link OCPP-COLIN physical tags to USER002  
('USER002', 'OCPP-COLIN', 'USER001', 'Admin assignment', true),
('USER002', 'C4E3E041', 'USER001', 'Physical card assignment', true),

-- Link OCPP-GUEST to USER003
('USER003', 'OCPP-GUEST', 'USER001', 'Guest access assignment', true),
('USER003', 'GUEST001', 'USER001', 'Guest physical card', true),

-- Link POLARIS-EXPRESS meta-tag to multiple users (for remote start capability)
('USER001', 'POLARIS-EXPRESS', 'USER001', 'Remote start access', true),
('USER002', 'POLARIS-EXPRESS', 'USER001', 'Remote start access', true),
('USER003', 'POLARIS-EXPRESS', 'USER001', 'Remote start access', true)
ON CONFLICT (user_id, tag_id) DO UPDATE SET
    linked_by = EXCLUDED.linked_by,
    link_reason = EXCLUDED.link_reason,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Create sample nanoid-to-user mappings
-- Each user gets their own nanoid tag for remote transactions
INSERT INTO public.user_tag_links (user_id, tag_id, linked_by, link_reason, is_active) VALUES
('USER001', 'K2N8P9R3', 'USER001', 'Personal nanoid for remote transactions', true),
('USER002', 'M7Q4T6W9', 'USER001', 'Personal nanoid for remote transactions', true),
('USER003', 'H5J8L2N6', 'USER001', 'Personal nanoid for remote transactions', true)
ON CONFLICT (user_id, tag_id) DO UPDATE SET
    linked_by = EXCLUDED.linked_by,
    link_reason = EXCLUDED.link_reason,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Verify the data was inserted correctly
DO $$
DECLARE
    tag_count integer;
    link_count integer;
    user_tag_count integer;
    physical_tag_count integer;
    meta_tag_count integer;
BEGIN
    -- Count total tags
    SELECT COUNT(*) INTO tag_count FROM public.ocpp_tags;
    
    -- Count tag links
    SELECT COUNT(*) INTO link_count FROM public.user_tag_links WHERE is_active = true;
    
    -- Count by tag type
    SELECT COUNT(*) INTO user_tag_count FROM public.ocpp_tags WHERE tag_type = 'user';
    SELECT COUNT(*) INTO physical_tag_count FROM public.ocpp_tags WHERE tag_type = 'physical';
    SELECT COUNT(*) INTO meta_tag_count FROM public.ocpp_tags WHERE tag_type = 'meta';
    
    RAISE NOTICE 'Seed data verification:';
    RAISE NOTICE '- Total OCPP tags: %', tag_count;
    RAISE NOTICE '- Active user-tag links: %', link_count;
    RAISE NOTICE '- User tags: %', user_tag_count;
    RAISE NOTICE '- Physical tags: %', physical_tag_count;
    RAISE NOTICE '- Meta tags: %', meta_tag_count;
    
    -- Verify POLARIS-EXPRESS exists
    IF EXISTS (SELECT 1 FROM public.ocpp_tags WHERE id_tag = 'POLARIS-EXPRESS' AND tag_type = 'meta') THEN
        RAISE NOTICE '- POLARIS-EXPRESS meta-tag created successfully';
    ELSE
        RAISE WARNING 'POLARIS-EXPRESS meta-tag not found!';
    END IF;
END $$;
