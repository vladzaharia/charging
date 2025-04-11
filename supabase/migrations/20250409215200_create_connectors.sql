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

-- RLS Policies
-- Viewers can see connectors of non-hidden chargers
create policy "Viewers can see connectors of non-hidden chargers"
    on public.connectors
    for select
    using (
        exists (
            select 1 from public.chargers
            where chargers.id = connectors.charger_id
            and not chargers.is_hidden
            and has_permission(auth.uid(), 'charger', chargers.id, 'viewer'::permission_level)
        )
    );

-- Editors can see all connectors
create policy "Editors can see all connectors"
    on public.connectors
    for select
    using (
        exists (
            select 1 from public.chargers
            where chargers.id = connectors.charger_id
            and has_permission(auth.uid(), 'charger', chargers.id, 'editor'::permission_level)
        )
    );

-- Only managers can modify connectors
create policy "Managers can modify connectors"
    on public.connectors
    for all
    using (
        exists (
            select 1 from public.chargers
            where chargers.id = connectors.charger_id
            and has_permission(auth.uid(), 'charger', chargers.id, 'manager'::permission_level)
        )
    )
    with check (
        exists (
            select 1 from public.chargers
            where chargers.id = connectors.charger_id
            and has_permission(auth.uid(), 'charger', chargers.id, 'manager'::permission_level)
        )
    );

-- Enable audit tracking
SELECT audit.enable_tracking('public.connectors');

-- Grant permissions
grant usage on schema public to authenticated;
grant all on public.connectors to authenticated;
grant usage, select on all sequences in schema public to authenticated;

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
where (
    -- Show non-hidden chargers to viewers
    (not ch.is_hidden and has_permission(auth.uid(), 'charger', ch.id, 'viewer'::permission_level))
    -- Show all chargers to editors and managers
    or has_permission(auth.uid(), 'charger', ch.id, 'editor'::permission_level)
);
