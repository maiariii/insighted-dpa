-- Seed Script: seed.sql
-- Fulfills requirements for seeding Regions, Divisions, HRMO, Collaborators, and 12 Personnel Audit Records

-- 1. Initialize Region and Division Office
INSERT INTO regions (id, name)
VALUES ('NCR', 'National Capital Region (NCR)')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO division_offices (id, region_id, office_name)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'NCR', 'Regional Office - Proper')
ON CONFLICT (region_id, office_name) DO UPDATE SET office_name = EXCLUDED.office_name;

-- 2. Seed HRMO Registered User & Host HRMO Profile
-- Password for all seeded users: "DepEdPass2026!" (bcrypt hash below)
-- Passcode: "123456"
INSERT INTO users (id, region_id, division_id, position, first_name, last_name, deped_email, password_hash, passcode, role)
VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'NCR',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Administrative Officer V (HRMO)',
    'Juan',
    'Dela Cruz',
    'juan.delacruz@deped.gov.ph',
    '$2b$10$CxVI0bhtAV0dR2Cs4Wjt3OBHzyfVMwDbbyhzbkelu7NCsdKpjErpu', -- bcrypt of DepEdPass2026!
    '123456',
    'HRMO'
)
ON CONFLICT (deped_email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO host_hrmos (id, user_id, region_id, division_id)
VALUES (
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'NCR',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Seed 2 Collaborators Linked to Host HRMO
INSERT INTO users (id, region_id, division_id, position, first_name, last_name, deped_email, password_hash, passcode, role)
VALUES 
(
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'NCR',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Administrative Assistant II',
    'Maria',
    'Clara',
    'maria.clara@deped.gov.ph',
    '$2b$10$CxVI0bhtAV0dR2Cs4Wjt3OBHzyfVMwDbbyhzbkelu7NCsdKpjErpu',
    '123456',
    'COLLABORATOR'
),
(
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'NCR',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Administrative Officer II',
    'Crisostomo',
    'Ibarra',
    'crisostomo.ibarra@deped.gov.ph',
    '$2b$10$CxVI0bhtAV0dR2Cs4Wjt3OBHzyfVMwDbbyhzbkelu7NCsdKpjErpu',
    '123456',
    'COLLABORATOR'
)
ON CONFLICT (deped_email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO collaborators (id, user_id, host_hrmo_id, region_id, division_id)
VALUES 
(
    'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'NCR',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
),
(
    'a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'NCR',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Seed 12 Personnel Audit Records
-- Matching specs: 7 audited (position_status='FILLED'), 3 long-term unfilled, 3 publication stage / active vacancies
INSERT INTO personnel_audits (
    dpa_month, dpa_year, region_id, division_id, position_category, item_status, item_number, position_title,
    sg, year_created, years_unfilled, vacancy_aging_status, position_status, name_of_incumbent,
    first_day_of_service, date_of_vacancy, reason_for_vacancy, status_of_vacancy, other_remarks,
    tentative_date_to_fill_up, is_audited
)
VALUES
-- 7 FILLED / Audited Records
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teaching', 'Regular', 'OSEC-DECSB-TCH1-001-2020', 'Teacher I', 11, 2020, 0, 'Filled', 'FILLED', 'JOSE RIZAL', '2021-06-01', NULL, NULL, 'Active Service', 'Audited record', NULL, TRUE),
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teaching', 'Regular', 'OSEC-DECSB-TCH2-002-2019', 'Teacher II', 12, 2019, 0, 'Filled', 'FILLED', 'APOLINARIO MABINI', '2020-01-15', NULL, NULL, 'Active Service', 'Audited record', NULL, TRUE),
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teaching-Related', 'Regular', 'OSEC-DECSB-HT3-003-2018', 'Head Teacher III', 16, 2018, 0, 'Filled', 'FILLED', 'MELCHORA AQUINO', '2018-08-10', NULL, NULL, 'Active Service', 'Audited record', NULL, TRUE),
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Non-Teaching', 'Regular', 'OSEC-DECSB-AO5-004-2017', 'Administrative Officer V', 18, 2017, 0, 'Filled', 'FILLED', 'GABRIELA SILANG', '2017-03-20', NULL, NULL, 'Active Service', 'Audited record', NULL, TRUE),
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Non-Teaching', 'Regular', 'OSEC-DECSB-ADA6-005-2021', 'Administrative Aide VI', 6, 2021, 0, 'Filled', 'FILLED', 'MARCELO H. DEL PILAR', '2021-09-01', NULL, NULL, 'Active Service', 'Audited record', NULL, TRUE),
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teaching', 'Regular', 'OSEC-DECSB-MT1-006-2016', 'Master Teacher I', 18, 2016, 0, 'Filled', 'FILLED', 'ANTONIO LUNA', '2016-11-05', NULL, NULL, 'Active Service', 'Audited record', NULL, TRUE),
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teaching', 'Regular', 'OSEC-DECSB-TCH3-007-2022', 'Teacher III', 13, 2022, 0, 'Filled', 'FILLED', 'EMILIO JACINTO', '2022-04-12', NULL, NULL, 'Active Service', 'Audited record', NULL, TRUE),

-- 3 Long-Term Unfilled Vacancies
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Non-Teaching', 'Regular', 'OSEC-DECSB-ATT4-008-2020', 'Attorney IV', 23, 2020, 3, 'Over 2 Years Unfilled', 'UNFILLED', NULL, NULL, '2021-01-10', 'Resignation', 'Under Comparative Assessment', 'Long-term unfilled position', '2026-10-31', FALSE),
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Non-Teaching', 'Regular', 'OSEC-DECSB-ENG3-009-2021', 'Engineer III', 19, 2021, 2, 'Over 2 Years Unfilled', 'UNFILLED', NULL, NULL, '2022-03-15', 'Retirement', 'For Re-publication', 'Long-term unfilled position', '2026-11-15', FALSE),
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teaching-Related', 'Regular', 'OSEC-DECSB-EPS-010-2021', 'Education Program Supervisor', 22, 2021, 2, 'Over 2 Years Unfilled', 'UNFILLED', NULL, NULL, '2022-05-20', 'Promotion', 'Screening in Progress', 'Long-term unfilled position', '2026-12-01', FALSE),

-- 2 Additional Active Vacancies (Publication Stage)
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teaching', 'Regular', 'OSEC-DECSB-TCH1-011-2024', 'Teacher I', 11, 2024, 0, 'Newly Vacated', 'UNFILLED', NULL, NULL, '2024-01-15', 'Transfer', 'Posted in CSC Bulletin', 'Publication Stage', '2026-09-30', FALSE),
(8, 2026, 'NCR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Non-Teaching', 'Regular', 'OSEC-DECSB-ACCOUNTANT1-012-2024', 'Accountant I', 12, 2024, 0, 'Newly Vacated', 'UNFILLED', NULL, NULL, '2024-02-01', 'Resignation', 'Receiving Applications', 'Publication Stage', '2026-10-15', FALSE)
ON CONFLICT (item_number) DO NOTHING;
