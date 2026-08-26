-- Migration: 001_create_relational_auth_schema.sql
-- Production-Grade Relational Auth & Personnel Audit Schema

-- 1. Custom Enums (Safe creation blocks)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE user_role_type AS ENUM ('HRMO', 'COLLABORATOR', 'ADMIN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'personnel_category') THEN
        CREATE TYPE personnel_category AS ENUM ('Teaching', 'Non-Teaching', 'Teaching-Related');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'position_status_type') THEN
        CREATE TYPE position_status_type AS ENUM ('FILLED', 'UNFILLED');
    END IF;
END $$;

-- 2. Regions
CREATE TABLE IF NOT EXISTS regions (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

-- 3. Division Offices
CREATE TABLE IF NOT EXISTS division_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id VARCHAR(20) REFERENCES regions(id) ON DELETE CASCADE,
    office_name VARCHAR(150) NOT NULL,
    CONSTRAINT uq_region_office UNIQUE (region_id, office_name)
);

-- 4. Central Authentication & Profile Directory (Registration & Login)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id VARCHAR(20) NOT NULL REFERENCES regions(id),
    division_id UUID NOT NULL REFERENCES division_offices(id),
    position VARCHAR(150) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    deped_email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    passcode VARCHAR(100) NOT NULL,
    role user_role_type NOT NULL DEFAULT 'COLLABORATOR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_user_geographic_identity UNIQUE (id, region_id, division_id)
);

-- Collaborators Table
CREATE TABLE IF NOT EXISTS collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    region_id VARCHAR(255) NOT NULL,
    division_id VARCHAR(255) NOT NULL,
    host_hrmo_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Personnel Audits
CREATE TABLE IF NOT EXISTS personnel_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpa_month INT NOT NULL DEFAULT 8,
    dpa_year INT NOT NULL DEFAULT 2026,
    region_id VARCHAR(255) NOT NULL,
    division_id VARCHAR(255) NOT NULL,
    position_category personnel_category NOT NULL,
    item_status VARCHAR(50) NOT NULL,
    item_number VARCHAR(100) UNIQUE NOT NULL,
    position_title VARCHAR(150) NOT NULL,
    sg INT NOT NULL,
    year_created INT NOT NULL,
    years_unfilled INT NOT NULL,
    vacancy_aging_status VARCHAR(100),
    position_status position_status_type NOT NULL DEFAULT 'UNFILLED',
    name_of_incumbent VARCHAR(150),
    first_day_of_service DATE,
    date_of_vacancy DATE,
    reason_for_vacancy VARCHAR(150),
    status_of_vacancy VARCHAR(250),
    other_remarks TEXT,
    tentative_date_to_fill_up DATE,
    is_audited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_incumbent_filled_state CHECK (
        (position_status = 'FILLED' AND name_of_incumbent IS NOT NULL AND first_day_of_service IS NOT NULL) OR
        (position_status = 'UNFILLED' AND name_of_incumbent IS NULL AND first_day_of_service IS NULL)
    )
);

-- 8. Incumbent Name Uppercase Trigger
CREATE OR REPLACE FUNCTION trg_uppercase_incumbent_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.name_of_incumbent IS NOT NULL THEN
        NEW.name_of_incumbent := UPPER(NEW.name_of_incumbent);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_uppercase_incumbent ON personnel_audits;
CREATE TRIGGER trg_uppercase_incumbent
BEFORE INSERT OR UPDATE ON personnel_audits
FOR EACH ROW
EXECUTE FUNCTION trg_uppercase_incumbent_name();

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_audits_lookup_composite 
ON personnel_audits (region_id, division_id, position_status, is_audited);

CREATE INDEX IF NOT EXISTS idx_audits_unfilled_partial 
ON personnel_audits (division_id) WHERE position_status = 'UNFILLED';
