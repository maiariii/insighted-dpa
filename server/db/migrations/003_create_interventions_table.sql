CREATE TABLE IF NOT EXISTS other_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_of_concern VARCHAR(255) NOT NULL,
  intervention_to_undertake TEXT NOT NULL,
  responsible_office VARCHAR(255) NOT NULL,
  target_date DATE NOT NULL,
  expected_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  remarks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user-scoped retrieval
CREATE INDEX IF NOT EXISTS idx_other_interventions_user ON other_interventions(user_id);
