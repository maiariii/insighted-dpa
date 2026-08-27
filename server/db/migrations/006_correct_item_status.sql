-- Migration 006: Correct item_status for records erroneously set to 'Audited'
-- Corrected values mapped directly from source-of-truth CSV: 2personnel_audits_202608251903.csv

UPDATE personnel_audits SET item_status = 'Regular', updated_at = NOW() WHERE item_number = 'OSEC-DECSB-MTCHR1-30144-2016';
UPDATE personnel_audits SET item_status = 'Regular', updated_at = NOW() WHERE item_number = 'OSEC-DECSB-MTCHR2-30032-2006';
UPDATE personnel_audits SET item_status = 'Regular', updated_at = NOW() WHERE item_number = 'OSEC-DECSB-GUIDC1-30037-1998';
UPDATE personnel_audits SET item_status = 'Regular', updated_at = NOW() WHERE item_number = 'OSEC-DECSB-GUIDC2-30313-2016';
UPDATE personnel_audits SET item_status = 'CTI',     updated_at = NOW() WHERE item_number = 'OSEC-DECSB-ADA4-30239-2004';
UPDATE personnel_audits SET item_status = 'Regular', updated_at = NOW() WHERE item_number = 'OSEC-DECSB-MTCHR1-30112-2018';
UPDATE personnel_audits SET item_status = 'Regular', updated_at = NOW() WHERE item_number = 'OSEC-DECSB-ADA4-30248-2004';
UPDATE personnel_audits SET item_status = 'Regular', updated_at = NOW() WHERE item_number = 'OSEC-DECSB-GUIDC2-30314-2016';
UPDATE personnel_audits SET item_status = 'Regular', updated_at = NOW() WHERE item_number = 'OSEC-DECSB-GUIDC2-30310-2016';
UPDATE personnel_audits SET item_status = 'Regular', updated_at = NOW() WHERE item_number = 'OSEC-DECSB-GUIDC1-30006-2010';
UPDATE personnel_audits SET item_status = 'Regular', updated_at = NOW() WHERE item_number = 'OSEC-DECSB-GUIDC1-31256-2011';
