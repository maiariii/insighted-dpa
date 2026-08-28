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

  try {
    const dedupeMigrationPath = path.join(__dirname, "migrations/004_dedupe_interventions.sql");
    const dedupeSql = fs.readFileSync(dedupeMigrationPath, "utf8");
    await pool.query(dedupeSql);
  } catch (dedupeErr) {
    console.error("Error executing interventions de-duplication script:", dedupeErr);
  }

  try {
    const backfillAuditedPath = path.join(__dirname, "migrations/005_backfill_audited_flag.sql");
    const backfillAuditedSql = fs.readFileSync(backfillAuditedPath, "utf8");
    await pool.query(backfillAuditedSql);
  } catch (backfillErr) {
    console.error("Error executing is_audited backfill script:", backfillErr);
  }

  console.log("✅ Database schema migration executed successfully.");
}

export default {
  pool,
  query,
  runMigration
};
