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
-- Anyone can see connectors of non-hidden chargers
create policy "Connectors of non-hidden chargers are viewable by everyone"
    on public.connectors
    for select
    using (
        exists (
            select 1 from public.chargers
            where chargers.id = connectors.charger_id
            and not chargers.is_hidden
        )
    );

-- Create a policy for administrators to see all connectors
create policy "Administrators can view all connectors"
    on public.connectors
    for select
    using (
        exists (
            select 1 from public.chargers
            where chargers.id = connectors.charger_id
        ) and
        auth.role() = 'authenticated' and
        auth.jwt()->>'role' = 'Administrator'
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
    auth.jwt()->>'role' = 'Administrator'
);
