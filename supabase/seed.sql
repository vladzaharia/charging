-- Sample charger data
insert into public.chargers (
    charger_uuid,
    charger_id,
    site_uuid,
    site_id,
    is_hidden
) values
(
    '01e06a42-62f3-498f-acb0-3ed5b66a3c53',  -- Testbed charger UUID
    52811252,
    '16b8d5ef-3f6d-412c-8aa5-e60fe707d951',  -- Testbed site UUID
    5099,
    false
),
(
    '326edcc4-71d6-40e3-90c6-af3ed8779b21',  -- Cap Hill charger UUID
    52811251,
    'e8d339a2-e241-4500-b81f-54aaf2c8eaae',  -- Cap Hill site UUID
    5098,
    true
);

-- Sample connector data (after chargers are created)
with testbed_charger as (
    select id
    from public.chargers
    where charger_id = 52811252  -- Testbed charger
), caphill_charger as (
    select id
    from public.chargers
    where charger_id = 52811251  -- Testbed charger
)
insert into public.connectors (
    charger_id,
    connector_id,
    connector_idx,
    connector_type
)
values
(
    (select id from testbed_charger),
    5875,  -- Connector ID for first connector
    1,     -- First connector index
    'j1772'::connector_type
),
(
    (select id from testbed_charger),
    5876,  -- Connector ID for second connector
    2,     -- Second connector index
    'j1772'::connector_type
),
(
    (select id from caphill_charger),
    5968,  -- Connector ID for second connector
    1,     -- First connector index
    'j1772'::connector_type
)