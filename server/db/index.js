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
  // Safe column size upgrades for existing database
  try {
    await pool.query(`
      ALTER TABLE regions ALTER COLUMN id TYPE VARCHAR(20);
      ALTER TABLE division_offices ALTER COLUMN region_id TYPE VARCHAR(20);
      ALTER TABLE users ALTER COLUMN region_id TYPE VARCHAR(20);
      ALTER TABLE host_hrmos ALTER COLUMN region_id TYPE VARCHAR(20);
      ALTER TABLE collaborators ALTER COLUMN region_id TYPE VARCHAR(20);
      ALTER TABLE personnel_audits ALTER COLUMN region_id TYPE VARCHAR(20);

      ALTER TABLE personnel_audits ADD COLUMN IF NOT EXISTS dpa_month INT NOT NULL DEFAULT 8;
      ALTER TABLE personnel_audits ADD COLUMN IF NOT EXISTS dpa_year INT NOT NULL DEFAULT 2026;
    `);
  } catch (err) {
    // Ignore errors if tables do not exist yet
  }

  const migrationPath = path.join(__dirname, "migrations/001_create_relational_auth_schema.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");
  await pool.query(sql);
  console.log("✅ Database schema migration executed successfully.");
}

/**
 * Run seed SQL file against the current database pool
 */
async function runSeed() {
  const seedPath = path.join(__dirname, "seed.sql");
  const sql = fs.readFileSync(seedPath, "utf8");
  await pool.query(sql);
  console.log("✅ Database seed executed successfully.");
}

module.exports = {
  pool,
  query,
  runMigration,
  runSeed
};
