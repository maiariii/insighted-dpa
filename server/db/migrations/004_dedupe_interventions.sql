-- Remove interventions that were silently double-inserted by the client-side
-- "Add Intervention" duplicate-submission bug (a stacked submit handler fired
-- the create request twice per click). Keeps the earliest row per unique
-- (user_id, area_of_concern, intervention_to_undertake, responsible_office,
-- target_date) combination and deletes any later duplicates. Safe to re-run:
-- once duplicates are gone this is a no-op.
DELETE FROM other_interventions a
USING other_interventions b
WHERE a.user_id = b.user_id
  AND a.area_of_concern = b.area_of_concern
  AND a.intervention_to_undertake = b.intervention_to_undertake
  AND a.responsible_office = b.responsible_office
  AND a.target_date = b.target_date
  AND (a.created_at, a.id) > (b.created_at, b.id);
