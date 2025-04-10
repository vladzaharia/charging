-- Sample charger data
insert into public.chargers (
    charger_uuid,
    charger_id,
    site_uuid,
    site_id,
    is_hidden,
    is_default
) values 
(
    '01e06a42-62f3-498f-acb0-3ed5b66a3c53',  -- Testbed charger UUID
    '52811252',
    '16b8d5ef-3f6d-412c-8aa5-e60fe707d951',  -- Testbed site UUID
    5099,
    false,
    true  -- This will be our default charger
),
(
    '326edcc4-71d6-40e3-90c6-af3ed8779b21',  -- Cap Hill charger UUID
    '52811251',
    'e8d339a2-e241-4500-b81f-54aaf2c8eaae',  -- Cap Hill site UUID
    5098,
    true,
    false
);

-- Sample connector data (after chargers are created)
insert into public.connectors (
    charger_id,
    connector_id,
    connector_idx,
    connector_type
) 
select 
    c.id,  -- Get the charger's internal ID
    5875,  -- Connector ID for first connector
    0,  -- First connector index
    'j1772'::connector_type  -- Type with explicit cast
from public.chargers c
where c.charger_id = '52811252'
union all
select 
    c.id,  -- Get the charger's internal ID
    5876,  -- Connector ID for second connector
    1,  -- Second connector index
    'ccs1'::connector_type  -- Type with explicit cast
from public.chargers c
where c.charger_id = '52811252'
union all
select 
    c.id,  -- Get the charger's internal ID
    5877,  -- Connector ID for third connector
    2,  -- Third connector index
    'nacs'::connector_type  -- Type with explicit cast
from public.chargers c
where c.charger_id = '52811252'
union all
select 
    c.id,  -- Get the charger's internal ID
    5878,  -- Connector ID for first connector
    0,  -- First connector index
    'j1772'::connector_type  -- Type with explicit cast
from public.chargers c
where c.charger_id = '52811251';
