import express from "express";
import { verifyToken } from "./auth.js";
import { query } from "../db/index.js";
import { validateBody } from "../middleware/validate.js";
import { InterventionCreateSchema } from "@project/shared";

const router = express.Router();

export const GET_KPI_METRICS_SQL = `
  SELECT
    COUNT(*)::int AS total_monitored,
    COALESCE(SUM(CASE WHEN item_status = 'Audited' OR position_status = 'FILLED' OR is_audited = true THEN 1 ELSE 0 END), 0)::int AS audited_items,
    COALESCE(SUM(CASE WHEN (item_status != 'Audited' AND (position_status IS NULL OR position_status != 'FILLED') AND (is_audited IS NULL OR is_audited = false)) OR item_status IS NULL THEN 1 ELSE 0 END), 0)::int AS remaining_items
  FROM personnel_audits
  WHERE ($1::varchar IS NULL OR region_id = $1 OR region_id ILIKE '%' || $1 || '%')
    AND ($2::varchar IS NULL OR division_id = $2 OR division_id ILIKE '%' || $2 || '%'
         OR $2 ILIKE '%' || REPLACE(division_id, 'Division of ', '') || '%');
`;

export const GET_AGING_DISTRIBUTION_SQL = `
  SELECT
    COALESCE(vacancy_aging_status, 'Unspecified') AS status,
    COUNT(*)::int AS count
  FROM personnel_audits
  WHERE ($1::varchar IS NULL OR region_id = $1 OR region_id ILIKE '%' || $1 || '%')
    AND ($2::varchar IS NULL OR division_id = $2 OR division_id ILIKE '%' || $2 || '%'
         OR $2 ILIKE '%' || REPLACE(division_id, 'Division of ', '') || '%')
    AND position_status = 'UNFILLED'
  GROUP BY vacancy_aging_status
  ORDER BY count DESC;
`;

export const GET_REASONS_UNFILLED_SQL = `
  SELECT
    COALESCE(reason_for_vacancy, 'Unspecified') AS reason,
    COUNT(*)::int AS count
  FROM personnel_audits
  WHERE ($1::varchar IS NULL OR region_id = $1 OR region_id ILIKE '%' || $1 || '%')
    AND ($2::varchar IS NULL OR division_id = $2 OR division_id ILIKE '%' || $2 || '%'
         OR $2 ILIKE '%' || REPLACE(division_id, 'Division of ', '') || '%')
    AND position_status = 'UNFILLED'
  GROUP BY reason_for_vacancy
  ORDER BY count DESC;
`;

export const GET_KPI_METRICS_SQLITE = `
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
 */
router.get(["/records", "/personnel-audit/records", "/api/personnel-audit/records", "/insighted-dpa/api/personnel-audit/records"], verifyToken, async (req, res) => {
  try {
    const { region_id, division_id, page, limit, offset: queryOffset, item_status, position_category, search } = req.query;
    const targetRegion = region_id || req.user.region_id;
    const targetDivision = division_id || req.user.division_id;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(10000, parseInt(limit, 10) || 5000));
    const offsetNum = queryOffset !== undefined ? Math.max(0, parseInt(queryOffset, 10) || 0) : (pageNum - 1) * limitNum;

    const db = req.app.get("dbClient");

    if (db && typeof db.query === "function") {
      let whereConditions = [
        `($1::varchar IS NULL OR pa.region_id = $1 OR pa.region_id ILIKE '%' || $1 || '%')`,
        `($2::varchar IS NULL OR pa.division_id = $2 OR pa.division_id ILIKE '%' || $2 || '%' OR $2 ILIKE '%' || REPLACE(pa.division_id, 'Division of ', '') || '%')`
      ];
      let sqlParams = [targetRegion, targetDivision];

      if (item_status) {
        sqlParams.push(item_status);
        whereConditions.push(`pa.item_status = $${sqlParams.length}`);
      }
      if (position_category) {
        sqlParams.push(position_category);
        whereConditions.push(`pa.position_category = $${sqlParams.length}`);
      }
      if (search) {
        sqlParams.push(`%${search}%`);
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
 */
router.get(["/kpis", "/personnel-audit/kpis", "/api/personnel-audit/kpis", "/insighted-dpa/api/personnel-audit/kpis"], verifyToken, async (req, res) => {
  try {
    const db = req.app.get("dbClient");

    const userRegion   = req.user.region_id   || null;
    const userDivision = req.user.division_id  || null;

    const rawRegion  = req.query.region  && typeof req.query.region  === "string" ? req.query.region.trim()  : null;
    const rawOffice  = req.query.office  && typeof req.query.office  === "string" ? req.query.office.trim()  : null;

    const filterRegion   = rawRegion  || userRegion;
    const filterDivision = rawOffice  || userDivision;

    const params = [filterRegion, filterDivision];

    if (db && typeof db.query === "function") {
      const [kpiRes, agingRes, reasonsRes] = await Promise.all([
        db.query(GET_KPI_METRICS_SQL,          params),
        db.query(GET_AGING_DISTRIBUTION_SQL,   params),
        db.query(GET_REASONS_UNFILLED_SQL,     params)
      ]);

      const kpiRow = kpiRes.rows[0] || {};
      const total     = parseInt(kpiRow.total_monitored || 0, 10);
      const audited   = parseInt(kpiRow.audited_items   || 0, 10);
      const remaining = parseInt(kpiRow.remaining_items || 0, 10);

      const completionPercentage = total > 0 ? parseFloat(((audited / total) * 100).toFixed(1)) : 0;

      return res.status(200).json({
        status: "success",
        success: true,
        totalUnfilled:        total,
        auditedItems:         audited,
        remainingItems:       remaining,
        completionPercentage,
        kpis: {
          totalUnfilled:        total,
          auditedItems:         audited,
          remainingItems:       remaining,
          completionPercentage,
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

/**
 * GET /api/personnel-audit/interventions
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
 */
router.post(
  ["/interventions", "/personnel-audit/interventions", "/api/personnel-audit/interventions", "/insighted-dpa/api/personnel-audit/interventions"],
  verifyToken,
  validateBody(InterventionCreateSchema),
  async (req, res) => {
    const payload = req.validatedBody || req.body || {};
    const { area_of_concern, intervention_to_undertake, responsible_office, target_date, expected_outcomes, remarks } = payload;

    try {
      const userId = req.user.id;
      const userName = `${req.user.first_name || ''} ${req.user.last_name || 'HRMO'}`.trim() || "Personnel Auditor";

      const outcomesArray = Array.isArray(expected_outcomes)
        ? expected_outcomes.filter(o => o && String(o).trim() !== "")
        : [];

      const initialRemarksLog = remarks && String(remarks).trim() !== ""
        ? [{ text: String(remarks).trim(), by: userName, at: new Date().toISOString() }]
        : [];

      const db = req.app.get("dbClient");
      const queryFn = (db && typeof db.query === "function") ? db.query.bind(db) : query;

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
        JSON.stringify(outcomesArray),
        JSON.stringify(initialRemarksLog)
      ]);

      res.status(201).json({ success: true, intervention: result.rows[0] });
    } catch (err) {
      console.error("Error saving intervention:", err);
      res.status(500).json({ error: "Internal database error saving intervention" });
    }
  }
);

export default router;
