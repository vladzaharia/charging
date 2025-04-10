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

-- Function to get the default charger
create or replace function get_default_charger()
returns table (
    id char(8),
    charger_uuid uuid,
    charger_id integer,
    site_uuid uuid,
    site_id integer,
    is_hidden boolean,
    is_default boolean
) as $$
begin
    return query
    select c.*
    from public.chargers c
    where c.is_default
    limit 1;
end;
$$ language plpgsql stable;

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
-- Unauthenticated users can see non-hidden chargers
-- Administrators can see all chargers
create policy "Chargers are viewable by everyone if not hidden"
    on public.chargers
    for select
    using (
        not is_hidden or  -- Allow non-hidden chargers for everyone
        (
            auth.role() = 'authenticated' and  -- Check if user is authenticated
            exists (  -- Check if user has administrator role
                select 1
                from auth.users
                where auth.users.id = auth.uid()
                and auth.users.role = 'Administrator'
            )
        )
    );

-- Create a view for visible chargers
create or replace view visible_chargers as
select c.*
from public.chargers c
where not c.is_hidden or (
    auth.role() = 'authenticated' and
    exists (
        select 1
        from auth.users
        where auth.users.id = auth.uid()
        and auth.users.role = 'Administrator'
    )
);
