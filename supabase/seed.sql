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
);

-- Sample OCPP tags data (minimal - just ID mapping and hierarchy)
INSERT INTO public.ocpp_tags (id_tag, steve_tag_pk, parent_id_tag) VALUES
-- Parent tags
('OCPP-VLAD', 3, NULL),
('OCPP-COLIN', 9, NULL),
('OCPP-GUEST', 14, NULL),
('OCPP-ADMIN', 19, NULL),
-- Child tags
('048CBACA551390', 1, 'OCPP-VLAD'),
('04FB5301C12A81', 18, 'OCPP-VLAD'),
('04E35301C12A81', 2, 'OCPP-VLAD'),
('04D25301C12A81', 4, 'OCPP-VLAD'),
('C4E3E041', 13, 'OCPP-COLIN'),
('C4E3E042', 10, 'OCPP-COLIN'),
('GUEST001', 15, 'OCPP-GUEST')
ON CONFLICT (id_tag) DO UPDATE SET
    steve_tag_pk = EXCLUDED.steve_tag_pk,
    parent_id_tag = EXCLUDED.parent_id_tag,
    updated_at = now();

-- Sample transactions data (billing essentials only)
-- Using actual SteVe transaction data for testing
WITH caphill_connector AS (
    SELECT c.id
    FROM public.connectors c
    JOIN public.chargers ch ON c.charger_id = ch.id
    WHERE ch.charge_box_id = '1157180' AND c.connector_idx = 1
)
INSERT INTO public.transactions (
    steve_transaction_id,
    charger_id,
    connector_id,
    ocpp_tag_id,
    start_timestamp,
    start_meter_value,
    stop_timestamp,
    stop_meter_value
) VALUES
-- Active transaction (transaction 11 from SteVe)
(
    11,
    (SELECT id FROM public.chargers WHERE charge_box_id = '1157180'),
    (SELECT id FROM caphill_connector),
    'OCPP-VLAD',
    '2025-06-27T18:51:18.000Z',
    141242,
    NULL,  -- Still active
    NULL   -- Still active
),
-- Completed transactions (recent ones from SteVe)
(
    10,
    (SELECT id FROM public.chargers WHERE charge_box_id = '1157180'),
    (SELECT id FROM caphill_connector),
    'OCPP-VLAD',
    '2025-06-23T20:33:11.000Z',
    116550,
    '2025-06-24T21:39:39.000Z',
    141242
),
(
    9,
    (SELECT id FROM public.chargers WHERE charge_box_id = '1157180'),
    (SELECT id FROM caphill_connector),
    '04FB5301C12A81',
    '2025-06-23T19:59:58.000Z',
    113538,
    '2025-06-23T20:16:38.000Z',
    116550
),
(
    8,
    (SELECT id FROM public.chargers WHERE charge_box_id = '1157180'),
    (SELECT id FROM caphill_connector),
    'OCPP-COLIN',
    '2025-06-23T02:07:22.000Z',
    99392,
    '2025-06-23T03:22:32.000Z',
    113538
)
ON CONFLICT (steve_transaction_id) DO UPDATE SET
    charger_id = EXCLUDED.charger_id,
    connector_id = EXCLUDED.connector_id,
    ocpp_tag_id = EXCLUDED.ocpp_tag_id,
    start_timestamp = EXCLUDED.start_timestamp,
    start_meter_value = EXCLUDED.start_meter_value,
    stop_timestamp = EXCLUDED.stop_timestamp,
    stop_meter_value = EXCLUDED.stop_meter_value,
    updated_at = now();