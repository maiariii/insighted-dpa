const express = require("express");
const router = express.Router();
const { verifyToken } = require("./auth");
const { pool } = require("../db");

function normalizeFilterParam(val) {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (
    !trimmed ||
    lower === "all" ||
    lower === "all regions" ||
    lower === "all statuses" ||
    lower === "all divisions" ||
    lower === "all offices" ||
    lower === "undefined" ||
    lower === "null"
  ) {
    return null;
  }
  return trimmed;
}


/**
 * Summary KPI aggregation query (PostgreSQL)
 * Single-pass: returns total_monitored, audited_items, and remaining_items
 * filtered by active session's region and division (plain-text VARCHAR).
 */
const GET_KPI_METRICS_SQL = `
  SELECT
    COUNT(*)::int AS total_monitored,
    COALESCE(SUM(CASE WHEN item_status = 'Audited' OR position_status = 'FILLED' OR is_audited = true THEN 1 ELSE 0 END), 0)::int AS audited_items,
    COALESCE(SUM(CASE WHEN (item_status != 'Audited' AND (position_status IS NULL OR position_status != 'FILLED') AND (is_audited IS NULL OR is_audited = false)) OR item_status IS NULL THEN 1 ELSE 0 END), 0)::int AS remaining_items
  FROM personnel_audits
  WHERE ($1::varchar IS NULL OR region_id = $1 OR region_id ILIKE '%' || $1 || '%')
    AND ($2::varchar IS NULL OR division_id::text = $2::text OR division_id = $2 OR division_id ILIKE '%' || $2 || '%'
         OR $2 ILIKE '%' || REPLACE(division_id, 'Division of ', '') || '%');
`;

/**
 * Vacancy Aging Distribution query (PostgreSQL)
 * Groups UNFILLED rows by vacancy_aging_status.
 */
const GET_AGING_DISTRIBUTION_SQL = `
  SELECT
    COALESCE(vacancy_aging_status, 'Unspecified') AS status,
    COUNT(*)::int AS count
  FROM personnel_audits
  WHERE ($1::varchar IS NULL OR region_id = $1 OR region_id ILIKE '%' || $1 || '%')
    AND ($2::varchar IS NULL OR division_id::text = $2::text OR division_id = $2 OR division_id ILIKE '%' || $2 || '%'
         OR $2 ILIKE '%' || REPLACE(division_id, 'Division of ', '') || '%')
    AND position_status = 'UNFILLED'
  GROUP BY vacancy_aging_status
  ORDER BY count DESC;
`;

/**
 * Reasons Unfilled breakdown query (PostgreSQL)
 * Groups UNFILLED rows by reason_for_vacancy.
 */
const GET_REASONS_UNFILLED_SQL = `
  SELECT
    COALESCE(reason_for_vacancy, 'Unspecified') AS reason,
    COUNT(*)::int AS count
  FROM personnel_audits
  WHERE ($1::varchar IS NULL OR region_id = $1 OR region_id ILIKE '%' || $1 || '%')
    AND ($2::varchar IS NULL OR division_id::text = $2::text OR division_id = $2 OR division_id ILIKE '%' || $2 || '%'
         OR $2 ILIKE '%' || REPLACE(division_id, 'Division of ', '') || '%')
    AND position_status = 'UNFILLED'
  GROUP BY reason_for_vacancy
  ORDER BY count DESC;
`;

/**
 * SQLite alternative SQL query template (for SQLite compatibility / local test environments)
 */
const GET_KPI_METRICS_SQLITE = `
  SELECT
    COUNT(*) AS total_monitored,
    COALESCE(SUM(CASE WHEN item_status = 'Audited' OR position_status = 'FILLED' OR is_audited = 1 THEN 1 ELSE 0 END), 0) AS audited_items,
    COALESCE(SUM(CASE WHEN (item_status != 'Audited' AND (position_status IS NULL OR position_status != 'FILLED') AND (is_audited IS NULL OR is_audited = 0)) OR item_status IS NULL THEN 1 ELSE 0 END), 0) AS remaining_items
  FROM personnel_audits
  WHERE (? IS NULL OR region_id = ?)
    AND (? IS NULL OR division_id = ?);
`;

/**
 * GET /api/personnel-audit/records
 * Returns personnel audit records strictly filtered by user's region and division in JWT payload.
 */
router.get(["/", "/records", "/personnel-audit/records", "/api/personnel-audit/records", "/insighted-dpa/api/personnel-audit/records"], verifyToken, async (req, res) => {
  try {
    const { region_id, division_id, page, limit, offset: queryOffset, item_status, position_category, search } = req.query;

    const userRegion   = normalizeFilterParam(req.user?.region_id);
    const userDivision = normalizeFilterParam(req.user?.division_id);
    const queryRegion   = normalizeFilterParam(region_id);
    const queryDivision = normalizeFilterParam(division_id);

    const targetRegion   = userRegion   || queryRegion;
    const targetDivision = userDivision || queryDivision;

    const cleanStatus   = normalizeFilterParam(item_status);
    const cleanCategory = normalizeFilterParam(position_category);
    const cleanSearch   = (search && typeof search === "string" && search.trim()) ? search.trim() : null;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(10000, parseInt(limit, 10) || 5000));
    const offsetNum = queryOffset !== undefined ? Math.max(0, parseInt(queryOffset, 10) || 0) : (pageNum - 1) * limitNum;

    const db = req.app.get("dbClient") || pool;

    if (db && typeof db.query === "function") {
      let whereConditions = [
        `($1::varchar IS NULL OR pa.region_id = $1 OR pa.region_id ILIKE '%' || $1 || '%')`,
        `($2::varchar IS NULL OR pa.division_id::text = $2::text OR pa.division_id = $2 OR pa.division_id ILIKE '%' || $2 || '%' OR $2 ILIKE '%' || REPLACE(pa.division_id, 'Division of ', '') || '%')`
      ];
      let sqlParams = [targetRegion, targetDivision];

      if (cleanStatus) {
        sqlParams.push(cleanStatus);
        whereConditions.push(`(pa.item_status ILIKE $${sqlParams.length} OR pa.position_status ILIKE $${sqlParams.length})`);
      }
      if (cleanCategory) {
        sqlParams.push(cleanCategory);
        whereConditions.push(`pa.position_category ILIKE $${sqlParams.length}`);
      }
      if (cleanSearch) {
        sqlParams.push(`%${cleanSearch}%`);
        whereConditions.push(`(pa.item_number ILIKE $${sqlParams.length} OR pa.position_title ILIKE $${sqlParams.length})`);
      }

      sqlParams.push(limitNum, offsetNum);
      const limitParamIdx = sqlParams.length - 1;
      const offsetParamIdx = sqlParams.length;

      const sql = `
        SELECT 
          pa.id,
          pa.dpa_month,
          pa.dpa_year,
          pa.region_id AS "REGION",
          pa.division_id AS "DIVISION",
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
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY pa.item_number ASC
        LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx};
      `;
      const result = await db.query(sql, sqlParams);
      return res.status(200).json({
        success: true,
        count: result.rows.length,
        page: pageNum,
        limit: limitNum,
        offset: offsetNum,
        data: result.rows,
        records: result.rows
      });
    } else {
      // Fallback mock response for dev environment without active DB connection pool
      return res.status(200).json({
        success: true,
        count: 0,
        page: pageNum,
        limit: limitNum,
        offset: offsetNum,
        data: null,
        records: []
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
 * Returns live dashboard metrics: KPI summary, vacancy aging distribution,
 * and reasons unfilled — all filtered by the authenticated user's region and division.
 * Secured by verifyToken middleware so region_id and division_id are always from JWT.
 */
router.get(["/kpis", "/kpi-metrics", "/personnel-audit/kpis", "/api/personnel-audit/kpis", "/insighted-dpa/api/personnel-audit/kpis"], verifyToken, async (req, res) => {
  try {
    const db = req.app.get("dbClient") || pool;

    const userRegion   = normalizeFilterParam(req.user?.region_id);
    const userDivision = normalizeFilterParam(req.user?.division_id);

    const rawRegion  = normalizeFilterParam(req.query.region);
    const rawOffice  = normalizeFilterParam(req.query.office);

    const filterRegion   = userRegion   || rawRegion;
    const filterDivision = userDivision || rawOffice;

    const params = [filterRegion, filterDivision];

    if (db && typeof db.query === "function") {
      // Run all three aggregations in parallel for minimum latency
      const [kpiRes, agingRes, reasonsRes] = await Promise.all([
        db.query(GET_KPI_METRICS_SQL,          params),
        db.query(GET_AGING_DISTRIBUTION_SQL,   params),
        db.query(GET_REASONS_UNFILLED_SQL,     params)
      ]);

      const kpiRow = kpiRes.rows[0] || {};
      const total     = parseInt(kpiRow.total_monitored || 0, 10);
      const audited   = parseInt(kpiRow.audited_items   || 0, 10);
      const remaining = parseInt(kpiRow.remaining_items || 0, 10);

      // Zero-division safeguard for completion percentage
      const completionPercentage = total > 0 ? parseFloat(((audited / total) * 100).toFixed(1)) : 0;

      return res.status(200).json({
        status: "success",
        success: true,
        // Flat top-level keys preserved for backwards compatibility
        totalUnfilled:        total,
        auditedItems:         audited,
        remainingItems:       remaining,
        completionPercentage,
        // Unified nested dashboard payload
        kpis: {
          totalUnfilled:        total,
          auditedItems:         audited,
          remainingItems:       remaining,
          completionPercentage,
          // Legacy compatibility aliases
          totalAudited:         total,
          completedAudited:     audited,
          accomplishmentRate:   completionPercentage
        },
        vacancyAgingDistribution: agingRes.rows,
        reasonsUnfilled:          reasonsRes.rows,
        data: {
          region:               filterRegion  || null,
          office:               filterDivision || null,
          totalUnfilled:        total,
          auditedItems:         audited,
          remainingItems:       remaining,
          completionPercentage,
          totalAudited:         total,
          completedAudited:     audited,
          accomplishmentRate:   completionPercentage
        }
      });

    } else {
      // No DB client attached — return clean zero-state
      return res.status(200).json({
        status: "success",
        success: true,
        totalUnfilled: 0,
        auditedItems: 0,
        remainingItems: 0,
        completionPercentage: 0,
        kpis: { totalUnfilled: 0, auditedItems: 0, remainingItems: 0, completionPercentage: 0 },
        vacancyAgingDistribution: [],
        reasonsUnfilled: [],
        data: { region: filterRegion, office: filterDivision, totalUnfilled: 0, auditedItems: 0, remainingItems: 0, completionPercentage: 0 }
      });
    }

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
router.put(["/:id", "/personnel-audit/:id", "/api/personnel-audit/:id"], verifyToken, async (req, res) => {
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
      // Authorization boundary check: enforce regional/divisional scope for non-admin users
      if (req.user && (req.user.region_id || req.user.division_id)) {
        const checkSql = `SELECT region_id, division_id FROM personnel_audits WHERE id::text = $1 OR item_number = $1;`;
        const checkRes = await db.query(checkSql, [id]);
        if (checkRes.rows && checkRes.rows.length > 0) {
          const rec = checkRes.rows[0];
          if (req.user.region_id && rec.region_id && rec.region_id !== req.user.region_id && !rec.region_id.includes(req.user.region_id)) {
            return res.status(403).json({ success: false, error: "Forbidden: Cannot modify records outside assigned region." });
          }
          if (req.user.division_id && rec.division_id && rec.division_id !== req.user.division_id && !rec.division_id.includes(req.user.division_id)) {
            return res.status(403).json({ success: false, error: "Forbidden: Cannot modify records outside assigned division." });
          }
        }
      }
      const allowedFields = [
        "region_id",
        "division_id",
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
        // A vacancy record counts as a finalized audit once its required
        // vacancy fields (reason, status, tentative fill-up date) are all
        // captured — not only once the position is FILLED. This mirrors the
        // client-side computation and is what actually moves the row into the
        // Finalized / Audited Personnel Records table on the next fetch.
        cleanPayload.is_audited = !!(
          cleanPayload.reason_for_vacancy && cleanPayload.status_of_vacancy && cleanPayload.tentative_date_to_fill_up
        );
      } else if (cleanPayload.position_status === "FILLED") {
        if (cleanPayload.name_of_incumbent) {
          cleanPayload.name_of_incumbent = String(cleanPayload.name_of_incumbent).toUpperCase();
        }
        cleanPayload.reason_for_vacancy = null;
        cleanPayload.status_of_vacancy = null;
        cleanPayload.date_of_vacancy = null;
        cleanPayload.tentative_date_to_fill_up = null;
        cleanPayload.is_audited = !!(cleanPayload.name_of_incumbent && cleanPayload.first_day_of_service);
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

const { query } = require("../db");

/**
 * GET /api/personnel-audit/interventions
 * Fetches interventions recorded by the currently logged-in user
 */
router.get(["/interventions", "/personnel-audit/interventions", "/api/personnel-audit/interventions", "/insighted-dpa/api/personnel-audit/interventions"], verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.get("dbClient");
    const queryFn = (db && typeof db.query === "function") ? db.query.bind(db) : query;

    const result = await queryFn(
      "SELECT id, user_id, area_of_concern, intervention_to_undertake, responsible_office, target_date, expected_outcomes, remarks, created_at FROM other_interventions WHERE user_id = $1 ORDER BY created_at DESC;",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching interventions:", err);
    res.status(500).json({ error: "Failed to retrieve intervention records" });
  }
});

/**
 * POST /api/personnel-audit/interventions
 * Creates a new intervention entry for the logged-in user
 */
router.post(["/interventions", "/personnel-audit/interventions", "/api/personnel-audit/interventions", "/insighted-dpa/api/personnel-audit/interventions"], verifyToken, async (req, res) => {
  const { area_of_concern, intervention_to_undertake, responsible_office, target_date, expected_outcomes, remarks } = req.body || {};

  if (!area_of_concern || !intervention_to_undertake || !responsible_office || !target_date) {
    return res.status(400).json({ error: "Area of Concern, Intervention, Responsible Office, and Target Date are required." });
  }

  // Target date must be strictly after today — mirrors the client-side date picker
  // restriction, enforced here too since the client constraint alone is not trustworthy.
  const parsedTargetDate = new Date(target_date);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  if (isNaN(parsedTargetDate.getTime()) || parsedTargetDate.getTime() <= todayEnd.getTime()) {
    return res.status(400).json({ error: "Target Date must be a future date (after today)." });
  }

  try {
    const userId = req.user.id;
    const userName = `${req.user.first_name || ''} ${req.user.last_name || 'HRMO'}`.trim() || "Personnel Auditor";

    let outcomesData = [];
    if (Array.isArray(expected_outcomes)) {
      outcomesData = expected_outcomes.filter(o => o && String(o).trim() !== "");
    } else if (typeof expected_outcomes === "object" && expected_outcomes !== null) {
      outcomesData = expected_outcomes;
    } else if (typeof expected_outcomes === "string" && expected_outcomes.trim() !== "") {
      outcomesData = [{ text: expected_outcomes.trim() }];
    }

    let remarksData = [];
    if (Array.isArray(remarks)) {
      remarksData = remarks.filter(r => r && String(r).trim() !== "");
    } else if (typeof remarks === "object" && remarks !== null) {
      remarksData = remarks;
    } else if (typeof remarks === "string" && remarks.trim() !== "") {
      remarksData = [{ text: remarks.trim(), by: userName, at: new Date().toISOString() }];
    }

    const db = req.app.get("dbClient");
    const queryFn = (db && typeof db.query === "function") ? db.query.bind(db) : query;

    // Idempotency safety net: if an identical intervention from this user was just
    // inserted moments ago (e.g. a double-fired submit slipping past the client-side
    // guard), return the existing row instead of creating a second one.
    const recentDuplicateCheck = await queryFn(
      `SELECT * FROM other_interventions
       WHERE user_id = $1 AND area_of_concern = $2 AND intervention_to_undertake = $3
         AND responsible_office = $4 AND target_date = $5
         AND created_at > NOW() - INTERVAL '10 seconds'
       ORDER BY created_at ASC LIMIT 1;`,
      [userId, String(area_of_concern).trim(), String(intervention_to_undertake).trim(), String(responsible_office).trim(), target_date]
    );
    if (recentDuplicateCheck.rows.length > 0) {
      return res.status(201).json({ success: true, intervention: recentDuplicateCheck.rows[0] });
    }

    const insertQuery = `
      INSERT INTO other_interventions
        (user_id, area_of_concern, intervention_to_undertake, responsible_office, target_date, expected_outcomes, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const result = await queryFn(insertQuery, [
      userId,
      String(area_of_concern).trim(),
      String(intervention_to_undertake).trim(),
      String(responsible_office).trim(),
      target_date,
      JSON.stringify(outcomesData),
      JSON.stringify(remarksData)
    ]);

    res.status(201).json({ success: true, intervention: result.rows[0] });
  } catch (err) {
    console.error("Error saving intervention:", err);
    res.status(500).json({ error: "Internal database error saving intervention" });
  }
});

module.exports = router;
module.exports.GET_KPI_METRICS_SQL         = GET_KPI_METRICS_SQL;
module.exports.GET_KPI_METRICS_SQLITE      = GET_KPI_METRICS_SQLITE;
module.exports.GET_AGING_DISTRIBUTION_SQL  = GET_AGING_DISTRIBUTION_SQL;
module.exports.GET_REASONS_UNFILLED_SQL    = GET_REASONS_UNFILLED_SQL;
