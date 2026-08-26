-- Backfill is_audited for rows that already satisfy the audit-completion
-- criteria but were saved before that criteria covered the UNFILLED path
-- (previously is_audited was only ever set true on the FILLED transition, so
-- an UNFILLED row with reason/status/tentative-date fully filled in never got
-- marked audited and never appeared in the Finalized / Audited table). Safe
-- to re-run: once flags are correct this is a no-op.
UPDATE personnel_audits
SET is_audited = true, updated_at = NOW()
WHERE (is_audited IS DISTINCT FROM true)
  AND (
    (position_status = 'FILLED' AND name_of_incumbent IS NOT NULL AND first_day_of_service IS NOT NULL)
    OR
    (position_status = 'UNFILLED' AND reason_for_vacancy IS NOT NULL AND status_of_vacancy IS NOT NULL AND tentative_date_to_fill_up IS NOT NULL)
  );
