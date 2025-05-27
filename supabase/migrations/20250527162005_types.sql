-- Custom types
CREATE TYPE permission_level AS ENUM ('viewer', 'editor', 'manager');
CREATE TYPE connector_type AS ENUM ('j1772', 'ccs1', 'nacs');
CREATE TYPE user_status AS ENUM ('unverified', 'active', 'disabled');

-- Custom domains
CREATE DOMAIN phone_number AS TEXT
    CHECK (VALUE IS NULL OR (
        VALUE ~ '^\+?[1-9]\d{1,14}$' AND
        length(VALUE) <= 16 AND
        VALUE !~ '[[:cntrl:]]'
    ));

CREATE DOMAIN postal_code_type AS TEXT
    CHECK (VALUE IS NULL OR (
        length(VALUE) <= 12 AND
        VALUE !~ '[[:cntrl:]]' AND
        (
            VALUE ~ '^\d{5}(-\d{4})?$' OR
            VALUE ~ '^[A-Z]\d[A-Z] \d[A-Z]\d$' OR
            VALUE ~ '^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$'
        )
    ));
