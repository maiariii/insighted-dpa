const express = require("express");
const router = express.Router();

/**
 * Single-pass SQL aggregation query template (PostgreSQL)
 * Uses conditional filtering to aggregate all KPI metrics in a single pass.
 */
const GET_KPI_METRICS_SQL = `
  SELECT 
    COUNT(*)::int AS total_audited,
    COUNT(*) FILTER (WHERE is_completed = true)::int AS completed_audited,
    COUNT(*) FILTER (WHERE is_long_term_unfilled = true)::int AS long_term_unfilled,
    COUNT(*) FILTER (WHERE is_new_vacancy = true)::int AS new_vacancies
  FROM personnel_audit_records
  WHERE region = $1 AND office = $2;
`;

/**
 * SQLite alternative SQL query template (for SQLite compatibility)
 */
const GET_KPI_METRICS_SQLITE = `
  SELECT 
    COUNT(*) AS total_audited,
    SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS completed_audited,
    SUM(CASE WHEN is_long_term_unfilled = 1 THEN 1 ELSE 0 END) AS long_term_unfilled,
    SUM(CASE WHEN is_new_vacancy = 1 THEN 1 ELSE 0 END) AS new_vacancies
  FROM personnel_audit_records
  WHERE region = ? AND office = ?;
`;

/**
 * Mock Data Repository (used when live DB client is not yet attached)
 */
const MOCK_DB_STORE = {
  "NCR|Regional Office - Proper": { totalAudited: 12, completedAudited: 7, longTermUnfilled: 3, newVacancies: 3 },
  "Region XI|Division Office": { totalAudited: 20, completedAudited: 15, longTermUnfilled: 2, newVacancies: 1 },
  "Region III|Regional Office": { totalAudited: 0, completedAudited: 0, longTermUnfilled: 0, newVacancies: 0 }
};

/**
 * GET /api/personnel-audit/kpis
 * Returns dynamic KPI metrics for a specified region and office.
 */
router.get("/kpis", async (req, res) => {
  try {
    const { region, office } = req.query;

    // 1. Parameter Validation & Sanitization
    if (!region || typeof region !== "string" || region.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing 'region' query parameter."
      });
    }

    if (!office || typeof office !== "string" || office.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing 'office' query parameter."
      });
    }

    const cleanRegion = region.trim();
    const cleanOffice = office.trim();

    let totalAudited = 0;
    let completedAudited = 0;
    let longTermUnfilled = 0;
    let newVacancies = 0;

    // 2. Query Execution (database client check)
    const db = req.app.get("dbClient");

    if (db && typeof db.query === "function") {
      // Execute parameterized SQL query against PostgreSQL pool
      const result = await db.query(GET_KPI_METRICS_SQL, [cleanRegion, cleanOffice]);
      const row = result.rows[0] || {};
      
      totalAudited = parseInt(row.total_audited || 0, 10);
      completedAudited = parseInt(row.completed_audited || 0, 10);
      longTermUnfilled = parseInt(row.long_term_unfilled || 0, 10);
      newVacancies = parseInt(row.new_vacancies || 0, 10);
    } else {
      // Demo / Fallback Mock Data execution
      const storeKey = `${cleanRegion}|${cleanOffice}`;
      const mockRecord = MOCK_DB_STORE[storeKey] || {
        totalAudited: 12,
        completedAudited: 7,
        longTermUnfilled: 3,
        newVacancies: 3
      };

      totalAudited = mockRecord.totalAudited;
      completedAudited = mockRecord.completedAudited;
      longTermUnfilled = mockRecord.longTermUnfilled;
      newVacancies = mockRecord.newVacancies;
    }

    // 3. Zero-Division Safeguard for Accomplishment Rate
    const accomplishmentRate = totalAudited > 0
      ? Math.round((completedAudited / totalAudited) * 100)
      : 0;

    // 4. Return Structured JSON Payload
    return res.status(200).json({
      success: true,
      data: {
        region: cleanRegion,
        office: cleanOffice,
        totalAudited,
        completedAudited,
        accomplishmentRate,
        longTermUnfilled,
        newVacancies
      }
    });

  } catch (error) {
    console.error("Error executing /api/personnel-audit/kpis endpoint:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "An unexpected error occurred while compiling audit KPIs."
    });
  }
});

module.exports = router;
module.exports.GET_KPI_METRICS_SQL = GET_KPI_METRICS_SQL;
module.exports.GET_KPI_METRICS_SQLITE = GET_KPI_METRICS_SQLITE;
