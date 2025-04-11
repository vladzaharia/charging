-- Create chargers table
create table if not exists public.chargers (
    -- Internal ID (nanoid, 8 characters, non-lowercase alphabet)
    id char(8) primary key default nanoid(8, '123456789ABCDEFGHJKLMNPQRSTUVWXYZ'),
    -- Charger UUID and ID
    charger_uuid uuid not null unique,
    charger_id integer not null unique,
    -- Site UUID and ID
    site_uuid uuid not null,
    site_id integer not null,
    -- Access control
    is_hidden boolean not null default false,
    -- Default charger to redirect to from homepage
    is_default boolean not null default false
);

-- Create indexes on various IDs for faster lookups
create index if not exists idx_chargers_site_uuid on public.chargers(site_uuid);
create index if not exists idx_chargers_site_id on public.chargers(site_id);
create index if not exists idx_chargers_charger_uuid on public.chargers(charger_uuid);
create index if not exists idx_chargers_charger_id on public.chargers(charger_id);

-- Function to get the default charger ID
create or replace function get_default_charger_id()
returns char(8) as $$
declare
    default_id char(8);
begin
    select c.id into default_id
    from public.chargers c
    where c.is_default
        and not c.is_hidden -- Only return non-hidden chargers
        and exists ( -- Check if user has permission to view
            select 1 from auth.users
            where auth.uid() = id
            and has_permission(auth.uid(), 'charger', c.id, 'viewer'::permission_level)
        )
    limit 1;

    return default_id;
end;
$$ language plpgsql stable security definer;

-- Grant access to the function for anonymous users
grant execute on function get_default_charger_id to anon;

-- Trigger function to ensure only one default charger exists
create or replace function ensure_single_default_charger()
returns trigger as $$
begin
    if new.is_default then
        -- Set is_default to false for all other chargers
        update public.chargers
        set is_default = false
        where id != new.id;
    end if;
    
    -- Allow service role or managers to modify default charger
    if auth.role() != 'service_role' and not has_permission(auth.uid(), 'charger', new.id, 'manager'::permission_level) then
        raise exception 'Only managers can modify default charger status';
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Create trigger for default charger
create trigger ensure_single_default_charger_trigger
    before insert or update on public.chargers
    for each row
    execute function ensure_single_default_charger();

-- Enable RLS
alter table public.chargers enable row level security;

-- RLS Policies
-- Viewers can see non-hidden chargers
create policy "Viewers can see non-hidden chargers"
    on public.chargers
    for select
    using (
        has_permission(auth.uid(), 'charger', id, 'viewer'::permission_level)
        and not is_hidden
    );

-- Editors can see all chargers including hidden ones
create policy "Editors can see all chargers"
    on public.chargers
    for select
    using (
        has_permission(auth.uid(), 'charger', id, 'editor'::permission_level)
    );

-- Only managers can modify chargers
create policy "Managers can modify chargers"
    on public.chargers
    for all
    using (
        has_permission(auth.uid(), 'charger', id, 'manager'::permission_level)
    )
    with check (
        has_permission(auth.uid(), 'charger', id, 'manager'::permission_level)
    );

-- Enable audit tracking
SELECT audit.enable_tracking('public.chargers');

-- Grant permissions
grant usage on schema public to authenticated;
grant all on public.chargers to authenticated;
grant usage, select on all sequences in schema public to authenticated;
