const express = require("express");
const router = express.Router();
const { verifyToken } = require("./auth");

/**
 * Single-pass SQL aggregation query template (PostgreSQL)
 * Uses conditional filtering to aggregate all KPI metrics in a single pass.
 */
const GET_KPI_METRICS_SQL = `
  SELECT 
    COUNT(*)::int AS total_unfilled,
    COALESCE(SUM(CASE WHEN item_status = 'Audited' OR position_status = 'FILLED' OR is_audited = true THEN 1 ELSE 0 END), 0)::int AS audited_items,
    COALESCE(SUM(CASE WHEN (item_status != 'Audited' AND (position_status IS NULL OR position_status != 'FILLED') AND (is_audited IS NULL OR is_audited = false)) OR item_status IS NULL THEN 1 ELSE 0 END), 0)::int AS remaining_items
  FROM personnel_audits pa
  LEFT JOIN regions r ON pa.region_id::text = r.id::text
  LEFT JOIN division_offices d ON pa.division_id::text = d.id::text
  WHERE ($1::text IS NULL OR r.name = $1 OR pa.region_id::text = $1 OR r.id::text = $1 OR r.name ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL 
         OR d.office_name = $2 
         OR pa.division_id::text = $2 
         OR d.id::text = $2
         OR d.office_name ILIKE '%' || $2 || '%'
         OR $2 ILIKE '%' || REPLACE(d.office_name, 'Division of ', '') || '%');
`;

/**
 * SQLite alternative SQL query template (for SQLite compatibility)
 */
const GET_KPI_METRICS_SQLITE = `
  SELECT 
    COUNT(*) AS total_unfilled,
    COALESCE(SUM(CASE WHEN item_status = 'Audited' OR position_status = 'FILLED' OR is_audited = 1 THEN 1 ELSE 0 END), 0) AS audited_items,
    COALESCE(SUM(CASE WHEN (item_status != 'Audited' AND (position_status IS NULL OR position_status != 'FILLED') AND (is_audited IS NULL OR is_audited = 0)) OR item_status IS NULL THEN 1 ELSE 0 END), 0) AS remaining_items
  FROM personnel_audits pa
  LEFT JOIN regions r ON pa.region_id = r.id
  LEFT JOIN division_offices d ON pa.division_id = d.id
  WHERE (? IS NULL OR r.name = ? OR pa.region_id = ?)
    AND (? IS NULL OR d.office_name = ? OR pa.division_id = ?);
`;

/**
 * Mock Data Repository (used when live DB client is not yet attached)
 */
const MOCK_DB_STORE = {
  "NCR|Regional Office - Proper": { totalUnfilled: 0, auditedItems: 0, remainingItems: 0, completionPercentage: 0.0 },
  "Region XI|Division Office": { totalUnfilled: 0, auditedItems: 0, remainingItems: 0, completionPercentage: 0.0 },
  "Region III|Regional Office": { totalUnfilled: 0, auditedItems: 0, remainingItems: 0, completionPercentage: 0.0 }
};

/**
 * GET /api/personnel-audit/records
 * Returns personnel audit records filtered by region and division of the user with pagination.
 */
router.get("/records", verifyToken, async (req, res) => {
  try {
    const { region_id, division_id, page = 1, limit = 5000 } = req.query;
    const targetRegion = region_id || req.user.region_id;
    const targetDivision = division_id || req.user.division_id;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(10000, parseInt(limit, 10) || 5000));
    const offset = (pageNum - 1) * limitNum;

    const db = req.app.get("dbClient");

    if (db && typeof db.query === "function") {
      const sql = `
        SELECT 
          pa.id,
          pa.dpa_month,
          pa.dpa_year,
          r.name AS "REGION",
          d.office_name AS "DIVISION",
          pa.position_category AS "POSITION CATEGORY",
          pa.item_status AS "ITEM_STATUS",
          pa.item_number AS "ITEM NUMBER",
          pa.position_title AS "POSITION TITLE",
          pa.sg AS "SG",
          pa.year_created AS "YEAR CREATED",
          pa.years_unfilled AS "YEARS UNFILLED",
          pa.vacancy_aging_status AS "VACANCY AGING STATUS",
          pa.position_status AS "POSITION STATUS",
          pa.name_of_incumbent AS "NAME OF INCUMBENT",
          TO_CHAR(pa.first_day_of_service, 'YYYY-MM-DD') AS "FIRST DAY OF SERVICE",
          TO_CHAR(pa.date_of_vacancy, 'YYYY-MM-DD') AS "DATE OF VACANCY",
          pa.reason_for_vacancy AS "REASON FOR VACANCY",
          pa.status_of_vacancy AS "STATUS OF VACANCY",
          TO_CHAR(pa.tentative_date_to_fill_up, 'YYYY-MM-DD') AS "TENTATIVE DATE TO FILL-UP",
          pa.is_audited
        FROM personnel_audits pa
        LEFT JOIN regions r ON pa.region_id::text = r.id::text
        LEFT JOIN division_offices d ON pa.division_id::text = d.id::text
        WHERE (pa.region_id::text = $1 OR r.name = $1 OR r.id::text = $1 OR r.name ILIKE '%' || $1 || '%')
          AND (pa.division_id::text = $2 OR d.office_name = $2 OR d.id::text = $2 OR d.office_name ILIKE '%' || $2 || '%' OR $2 ILIKE '%' || REPLACE(d.office_name, 'Division of ', '') || '%')
        ORDER BY pa.item_number ASC
        LIMIT $3 OFFSET $4;
      `;
      const result = await db.query(sql, [targetRegion, targetDivision, limitNum, offset]);
      return res.status(200).json({
        success: true,
        page: pageNum,
        limit: limitNum,
        data: result.rows
      });
    } else {
      // Fallback mock response for dev environment without active DB connection pool
      return res.status(200).json({
        success: true,
        page: pageNum,
        limit: limitNum,
        data: null
      });
    }
  } catch (error) {
    console.error("Error fetching personnel audit records:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message
    });
  }
});

/**
 * GET /api/personnel-audit/kpis
 * Returns dynamic KPI metrics for a specified region and office.
 */
router.get("/kpis", async (req, res) => {
  try {
    const { region, office } = req.query;

    const cleanRegion = region && typeof region === "string" ? region.trim() : null;
    const cleanOffice = office && typeof office === "string" ? office.trim() : null;

    let total = 0;
    let audited = 0;
    let remaining = 0;

    // Execute query against database if available
    const db = req.app.get("dbClient");

    if (db && typeof db.query === "function") {
      const result = await db.query(GET_KPI_METRICS_SQL, [cleanRegion, cleanOffice]);
      const row = result.rows[0] || {};
      
      total = parseInt(row.total_unfilled || 0, 10);
      audited = parseInt(row.audited_items || 0, 10);
      remaining = parseInt(row.remaining_items || 0, 10);
    } else {
      // Demo / Fallback Mock Data execution
      const storeKey = `${cleanRegion || "NCR"}|${cleanOffice || "Regional Office - Proper"}`;
      const mockRecord = MOCK_DB_STORE[storeKey] || {
        totalUnfilled: 0,
        auditedItems: 0,
        remainingItems: 0
      };

      total = mockRecord.totalUnfilled !== undefined ? mockRecord.totalUnfilled : (mockRecord.totalAudited || 0);
      audited = mockRecord.auditedItems !== undefined ? mockRecord.auditedItems : (mockRecord.completedAudited || 0);
      remaining = mockRecord.remainingItems !== undefined ? mockRecord.remainingItems : (total - audited);
    }

    // Zero-Division Safeguard for Completion Percentage
    const completionPercentage = total > 0 ? parseFloat(((audited / total) * 100).toFixed(1)) : 0;

    // Structured JSON Response Payload
    return res.status(200).json({
      status: "success",
      success: true,
      totalUnfilled: total,
      auditedItems: audited,
      remainingItems: remaining,
      completionPercentage,
      data: {
        region: cleanRegion || "NCR",
        office: cleanOffice || "Regional Office - Proper",
        totalUnfilled: total,
        auditedItems: audited,
        remainingItems: remaining,
        completionPercentage,
        // Backwards compatibility keys
        totalAudited: total,
        completedAudited: audited,
        accomplishmentRate: completionPercentage
      }
    });

  } catch (error) {
    console.error("Error executing /api/personnel-audit/kpis endpoint:", error);
    return res.status(500).json({
      status: "error",
      success: false,
      error: "Internal Server Error",
      message: "An unexpected error occurred while compiling audit KPIs."
    });
  }
});

/**
 * PUT /api/personnel-audit/:id
 * Updates personnel audit row record by ID
 */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    let payload = req.body || {};

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Missing record ID parameter."
      });
    }

    const db = req.app.get("dbClient");

    if (db && typeof db.query === "function") {
      const allowedFields = [
        "position_status",
        "name_of_incumbent",
        "first_day_of_service",
        "date_of_vacancy",
        "reason_for_vacancy",
        "status_of_vacancy",
        "other_remarks",
        "tentative_date_to_fill_up",
        "item_status",
        "is_audited"
      ];

      // Sanitize payload values: convert empty strings to null for text/dates
      const cleanPayload = {};
      for (const field of allowedFields) {
        if (payload[field] !== undefined) {
          const val = payload[field];
          if (val === "" || val === undefined) {
            cleanPayload[field] = null;
          } else {
            cleanPayload[field] = val;
          }
        }
      }

      // Enforce position_status rules for PostgreSQL constraint chk_incumbent_filled_state
      if (cleanPayload.position_status === "UNFILLED") {
        cleanPayload.name_of_incumbent = null;
        cleanPayload.first_day_of_service = null;
      } else if (cleanPayload.position_status === "FILLED") {
        if (cleanPayload.name_of_incumbent) {
          cleanPayload.name_of_incumbent = String(cleanPayload.name_of_incumbent).toUpperCase();
        }
        cleanPayload.reason_for_vacancy = null;
        cleanPayload.status_of_vacancy = null;
        cleanPayload.date_of_vacancy = null;
        cleanPayload.tentative_date_to_fill_up = null;
        cleanPayload.is_audited = true;
      }

      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      for (const [field, val] of Object.entries(cleanPayload)) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(val);
        paramIndex++;
      }

      if (setClauses.length > 0) {
        values.push(id);
        const updateSql = `
          UPDATE personnel_audits
          SET ${setClauses.join(", ")}, updated_at = NOW()
          WHERE id::text = $${paramIndex} OR item_number = $${paramIndex}
          RETURNING *;
        `;
        const result = await db.query(updateSql, values);
        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, error: "Record not found." });
        }
        return res.status(200).json({
          success: true,
          message: "Personnel audit row updated successfully.",
          data: result.rows[0]
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Personnel audit row updated successfully (mock).",
      data: { id, ...payload }
    });
  } catch (error) {
    console.error("Error updating personnel audit row:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message
    });
  }
});

module.exports = router;
module.exports.GET_KPI_METRICS_SQL = GET_KPI_METRICS_SQL;
module.exports.GET_KPI_METRICS_SQLITE = GET_KPI_METRICS_SQLITE;

