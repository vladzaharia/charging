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
    return new;
end;
$$ language plpgsql;

-- Create trigger to maintain single default charger
create trigger maintain_single_default_charger
    before insert or update of is_default
    on public.chargers
    for each row
    when (new.is_default)
    execute function ensure_single_default_charger();

-- Enable Row Level Security on chargers
alter table public.chargers enable row level security;

-- Create a policy for reading chargers
-- Anyone can see non-hidden chargers
create policy "Chargers are viewable by everyone if not hidden"
    on public.chargers
    for select
    using (not is_hidden);

-- Create a policy for administrators to see all chargers
create policy "Administrators can view all chargers"
    on public.chargers
    for select
    using (
        auth.role() = 'authenticated' and
        auth.jwt()->>'role' = 'Administrator'
    );

-- Create a view for visible chargers
create or replace view visible_chargers as
select c.*
from public.chargers c
where not c.is_hidden or (
    auth.role() = 'authenticated' and
    auth.jwt()->>'role' = 'Administrator'
);
