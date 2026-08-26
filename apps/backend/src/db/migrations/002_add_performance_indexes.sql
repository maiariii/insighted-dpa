-- Migration: 002_add_performance_indexes.sql
-- Performance Indexes for Personnel Audit lookups and aggregate telemetry

CREATE INDEX IF NOT EXISTS idx_personnel_audits_division_id 
ON personnel_audits (division_id);

CREATE INDEX IF NOT EXISTS idx_personnel_audits_item_status 
ON personnel_audits (item_status);

CREATE INDEX IF NOT EXISTS idx_personnel_audits_composite 
ON personnel_audits (division_id, item_status);

CREATE INDEX IF NOT EXISTS idx_personnel_audits_region_division 
ON personnel_audits (region_id, division_id);

-- Composite geo + vacancy-status index: accelerates KPI dashboard aggregation queries
-- that filter on (region_id, division_id, position_status) simultaneously.
CREATE INDEX IF NOT EXISTS idx_personnel_audits_composite_geo_status
ON personnel_audits (region_id, division_id, position_status);
