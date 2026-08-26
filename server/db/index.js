const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const connectionString = process.env.DATABASE_URL;

const config = {
  connectionString
};

if (connectionString && connectionString.includes("azure.com")) {
  config.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(config);

/**
 * Execute SQL query helper
 */
const query = (text, params) => pool.query(text, params);

/**
 * Run migration SQL file against the current database pool
 */
async function runMigration() {
  // Safe column size upgrades for existing database & decoupling FKs on personnel_audits
  try {
    await pool.query(`
      ALTER TABLE regions ALTER COLUMN id TYPE VARCHAR(20);
      ALTER TABLE division_offices ALTER COLUMN region_id TYPE VARCHAR(20);
      ALTER TABLE users ALTER COLUMN region_id TYPE VARCHAR(20);
      ALTER TABLE host_hrmos ALTER COLUMN region_id TYPE VARCHAR(20);
      ALTER TABLE collaborators ALTER COLUMN region_id TYPE VARCHAR(20);

      ALTER TABLE personnel_audits DROP CONSTRAINT IF EXISTS personnel_audits_region_id_fkey;
      ALTER TABLE personnel_audits DROP CONSTRAINT IF EXISTS personnel_audits_division_id_fkey;

      ALTER TABLE personnel_audits ALTER COLUMN region_id TYPE VARCHAR(255);
      ALTER TABLE personnel_audits ALTER COLUMN division_id TYPE VARCHAR(255);

      ALTER TABLE personnel_audits ADD COLUMN IF NOT EXISTS dpa_month INT NOT NULL DEFAULT 8;
      ALTER TABLE personnel_audits ADD COLUMN IF NOT EXISTS dpa_year INT NOT NULL DEFAULT 2026;
    `);
  } catch (err) {
    // Ignore errors if tables do not exist yet
  }

  const migrationPath = path.join(__dirname, "migrations/001_create_relational_auth_schema.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");
  await pool.query(sql);

  try {
    const indexMigrationPath = path.join(__dirname, "migrations/002_add_performance_indexes.sql");
    const indexSql = fs.readFileSync(indexMigrationPath, "utf8");
    await pool.query(indexSql);
  } catch (indexErr) {
    // Non-blocking if tables are created later
  }

  try {
    const interventionsMigrationPath = path.join(__dirname, "migrations/003_create_interventions_table.sql");
    const interventionsSql = fs.readFileSync(interventionsMigrationPath, "utf8");
    await pool.query(interventionsSql);
  } catch (interventionsErr) {
    console.error("Error executing interventions migration script:", interventionsErr);
    // Fallback inline table creation
    const createInterventionsTableSQL = `
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
      CREATE INDEX IF NOT EXISTS idx_other_interventions_user ON other_interventions(user_id);
    `;
    await pool.query(createInterventionsTableSQL);
  }

  console.log("✅ Database schema migration executed successfully.");
}

module.exports = {
  pool,
  query,
  runMigration
};
