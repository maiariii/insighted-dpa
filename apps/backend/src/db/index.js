import pg from "pg";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from workspace root & app directory
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("⚠️ Warning: DATABASE_URL is not set in environment.");
}

const config = {
  connectionString: connectionString || process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

if (
  process.env.NODE_ENV === "production" ||
  (connectionString && (connectionString.includes("azure.com") || connectionString.includes("postgres"))) ||
  process.env.PGSSL === "true"
) {
  config.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(config);

pool.on("error", (err) => {
  console.error("Unexpected background error on idle PostgreSQL pool client:", err.message);
});

export const query = (text, params) => pool.query(text, params);

export async function runMigration() {
  try {
    await pool.query(`
      ALTER TABLE users        DROP CONSTRAINT IF EXISTS users_division_id_fkey CASCADE;
      ALTER TABLE host_hrmos   DROP CONSTRAINT IF EXISTS host_hrmos_division_id_fkey CASCADE;
      ALTER TABLE collaborators DROP CONSTRAINT IF EXISTS collaborators_division_id_fkey CASCADE;
      ALTER TABLE users        DROP CONSTRAINT IF EXISTS uq_user_geographic_identity CASCADE;
      ALTER TABLE host_hrmos   DROP CONSTRAINT IF EXISTS uq_hrmo_geographic_identity CASCADE;
      ALTER TABLE host_hrmos   DROP CONSTRAINT IF EXISTS host_hrmos_user_id_region_id_division_id_fkey CASCADE;
      ALTER TABLE collaborators DROP CONSTRAINT IF EXISTS collaborators_user_id_region_id_division_id_fkey CASCADE;
      ALTER TABLE collaborators DROP CONSTRAINT IF EXISTS collaborators_host_hrmo_id_region_id_division_id_fkey CASCADE;

      DROP TABLE IF EXISTS host_hrmos CASCADE;

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

      ALTER TABLE regions          ALTER COLUMN id          TYPE VARCHAR(255);
      ALTER TABLE division_offices ALTER COLUMN region_id   TYPE VARCHAR(255);
      ALTER TABLE users            ALTER COLUMN region_id   TYPE VARCHAR(255);
      ALTER TABLE users            ALTER COLUMN division_id TYPE VARCHAR(255) USING division_id::text;

      ALTER TABLE personnel_audits DROP CONSTRAINT IF EXISTS personnel_audits_region_id_fkey CASCADE;
      ALTER TABLE personnel_audits DROP CONSTRAINT IF EXISTS personnel_audits_division_id_fkey CASCADE;

      ALTER TABLE personnel_audits ALTER COLUMN region_id  TYPE VARCHAR(255);
      ALTER TABLE personnel_audits ALTER COLUMN division_id TYPE VARCHAR(255);

      ALTER TABLE personnel_audits ADD COLUMN IF NOT EXISTS dpa_month INT NOT NULL DEFAULT 8;
      ALTER TABLE personnel_audits ADD COLUMN IF NOT EXISTS dpa_year  INT NOT NULL DEFAULT 2026;

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

export default {
  pool,
  query,
  runMigration
};
