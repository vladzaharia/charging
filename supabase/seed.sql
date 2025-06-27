-- Sample charger data
insert into public.chargers (
    charge_box_id,
    charge_box_pk,
    name,
    location,
    is_hidden
) values
-- (
--     'TESTBED_CHARGER_01',  -- SteVe charge box ID
--     1001,                  -- SteVe internal PK
--     'Testbed Charger',
--     'Development Lab',
--     false
-- ),
(
    '1157180',  -- SteVe charge box ID
    2,                  -- SteVe internal PK
    'Wallbox',
    'Capitol Hill',
    true
);

-- Sample connector data (after chargers are created)
-- with testbed_charger as (
--     select id
--     from public.chargers
--     where charge_box_id = 'TESTBED_CHARGER_01'
-- ), caphill_charger as ( 
with caphill_charger as (
    select id
    from public.chargers
    where charge_box_id = '1157180'
)
insert into public.connectors (
    charger_id,
    connector_idx,
    connector_type,
    max_amperage
)
values
-- (
--     (select id from testbed_charger),
--     1,     -- First connector index (SteVe uses this as definitive identifier)
--     'j1772'::connector_type,
--     32     -- 32 amp max
-- ),
-- (
--     (select id from testbed_charger),
--     2,     -- Second connector index
--     'j1772'::connector_type,
--     32     -- 32 amp max
-- ),
(
    (select id from caphill_charger),
    1,     -- First connector index
    'j1772'::connector_type,
    48     -- 48 amp max
)