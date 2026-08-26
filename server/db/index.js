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
  // Also migrates users/host_hrmos/collaborators division_id from UUID -> VARCHAR(255)
  try {
    await pool.query(`
      -- Drop all FK / unique constraints that depend on division_id type or cross-table refs
      ALTER TABLE users        DROP CONSTRAINT IF EXISTS users_division_id_fkey CASCADE;
      ALTER TABLE host_hrmos   DROP CONSTRAINT IF EXISTS host_hrmos_division_id_fkey CASCADE;
      ALTER TABLE collaborators DROP CONSTRAINT IF EXISTS collaborators_division_id_fkey CASCADE;
      ALTER TABLE users        DROP CONSTRAINT IF EXISTS uq_user_geographic_identity CASCADE;
      ALTER TABLE host_hrmos   DROP CONSTRAINT IF EXISTS uq_hrmo_geographic_identity CASCADE;
      ALTER TABLE host_hrmos   DROP CONSTRAINT IF EXISTS host_hrmos_user_id_region_id_division_id_fkey CASCADE;
      ALTER TABLE collaborators DROP CONSTRAINT IF EXISTS collaborators_user_id_region_id_division_id_fkey CASCADE;
      ALTER TABLE collaborators DROP CONSTRAINT IF EXISTS collaborators_host_hrmo_id_region_id_division_id_fkey CASCADE;

      -- Drop obsolete host_hrmos table
      DROP TABLE IF EXISTS host_hrmos CASCADE;

      -- Create collaborators table for HRMO invited helpers
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

      -- Widen ALL geography columns to VARCHAR(255) (supports full region names)
      ALTER TABLE regions          ALTER COLUMN id          TYPE VARCHAR(255);
      ALTER TABLE division_offices ALTER COLUMN region_id   TYPE VARCHAR(255);
      ALTER TABLE users            ALTER COLUMN region_id   TYPE VARCHAR(255);
      ALTER TABLE users            ALTER COLUMN division_id TYPE VARCHAR(255) USING division_id::text;

      -- Drop FK constraints on personnel_audits (already decoupled)
      ALTER TABLE personnel_audits DROP CONSTRAINT IF EXISTS personnel_audits_region_id_fkey CASCADE;
      ALTER TABLE personnel_audits DROP CONSTRAINT IF EXISTS personnel_audits_division_id_fkey CASCADE;

      -- Widen personnel_audits geography columns
      ALTER TABLE personnel_audits ALTER COLUMN region_id  TYPE VARCHAR(255);
      ALTER TABLE personnel_audits ALTER COLUMN division_id TYPE VARCHAR(255);

      ALTER TABLE personnel_audits ADD COLUMN IF NOT EXISTS dpa_month INT NOT NULL DEFAULT 8;
      ALTER TABLE personnel_audits ADD COLUMN IF NOT EXISTS dpa_year  INT NOT NULL DEFAULT 2026;

      -- Backfill plain-text region and division details for sebastian.cheng2@deped.gov.ph
      UPDATE users 
      SET region_id = 'Region V - Bicol', division_id = 'Division of Masbate City' 
      WHERE deped_email = 'sebastian.cheng2@deped.gov.ph';
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
