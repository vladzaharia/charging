-- Create enum for connector types
create type connector_type as enum ('j1772', 'ccs1', 'nacs');

-- Create connectors table
create table if not exists public.connectors (
    -- Internal ID (nanoid, 16 characters, non-lowercase alphabet)
    id char(16) primary key default nanoid(16, '123456789ABCDEFGHJKLMNPQRSTUVWXYZ'),
    -- Parent charger reference (with cascade delete)
    charger_id char(8) not null references public.chargers(id) on delete cascade,
    -- Connector details
    connector_id integer not null,
    connector_idx integer not null,
    connector_type connector_type not null,
    -- Ensure connector_idx is unique per charger
    unique(charger_id, connector_idx),
    -- Ensure connector_id is unique per charger
    unique(charger_id, connector_id)
);

-- Create indexes for connectors
create index if not exists idx_connectors_charger_id on public.connectors(charger_id);
create index if not exists idx_connectors_connector_id on public.connectors(connector_id);

-- Enable Row Level Security on connectors
alter table public.connectors enable row level security;

-- Create a policy for reading connectors
-- Visibility is inherited from the parent charger
create policy "Connectors inherit visibility from parent charger"
    on public.connectors
    for select
    using (
        exists (
            select 1 from public.chargers
            where chargers.id = connectors.charger_id
            and (
                not chargers.is_hidden or  -- Allow non-hidden chargers for everyone
                (
                    auth.role() = 'authenticated' and  -- Check if user is authenticated
                    exists (  -- Check if user has administrator role
                        select 1
                        from auth.users
                        where auth.users.id = auth.uid()
                        and auth.users.role = 'Administrator'
                    )
                )
            )
        )
    );

-- Create a view for visible connectors with their charger information
create or replace view visible_connectors as
select 
    con.*,
    ch.charger_uuid,
    ch.charger_id as parent_charger_id,
    ch.site_uuid,
    ch.site_id,
    ch.is_hidden,
    ch.is_default
from public.connectors con
join public.chargers ch on ch.id = con.charger_id
where not ch.is_hidden or (
    auth.role() = 'authenticated' and
    exists (
        select 1
        from auth.users
        where auth.users.id = auth.uid()
        and auth.users.role = 'Administrator'
    )
);

-- Function to get charger with its connectors
create or replace function get_charger_with_connectors(charger_id_param char(8))
returns json as $$
declare
    result json;
begin
    -- Check if user has access to the charger
    if not exists (
        select 1 from public.chargers
        where id = charger_id_param
        and (
            not is_hidden or
            (
                auth.role() = 'authenticated' and
                exists (
                    select 1
                    from auth.users
                    where auth.users.id = auth.uid()
                    and auth.users.role = 'Administrator'
                )
            )
        )
    ) then
        return null; -- Return null if user doesn't have access
    end if;

    -- Get charger and its connectors
    select 
        json_build_object(
            'charger', json_build_object(
                'id', c.id,
                'charger_uuid', c.charger_uuid,
                'charger_id', c.charger_id,
                'site_uuid', c.site_uuid,
                'site_id', c.site_id,
                'is_hidden', c.is_hidden,
                'is_default', c.is_default
            ),
            'connectors', coalesce(
                (
                    select json_agg(
                        json_build_object(
                            'id', con.id,
                            'connector_id', con.connector_id,
                            'connector_idx', con.connector_idx,
                            'connector_type', con.connector_type
                        )
                        order by con.connector_idx
                    )
                    from public.connectors con
                    where con.charger_id = c.id
                ),
                '[]'::json
            )
        ) into result
    from public.chargers c
    where c.id = charger_id_param;

    return result;
end;
$$ language plpgsql stable security definer;
