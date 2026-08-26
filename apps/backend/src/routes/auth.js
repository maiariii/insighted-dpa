import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/index.js";
import { validateBody } from "../middleware/validate.js";
import { LoginSchema, RegisterSchema } from "@project/shared";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "STRIDE_INSIGHTED_SECRET_2026_KEY_PROD";

/**
 * Middleware: Verify JWT Bearer Token
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Access denied. No authentication token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: "Invalid or expired token." });
  }
}

/**
 * GET /api/auth/regions-divisions
 * Open lookup endpoint for dynamic Region and Division Office options.
 */
router.get(["/regions-divisions", "/auth/regions-divisions", "/api/auth/regions-divisions", "/insighted-dpa/api/auth/regions-divisions"], async (req, res) => {
  try {
    const regionsResult = await db.query(
      "SELECT DISTINCT region_id AS id, region_id AS name FROM personnel_audits WHERE region_id IS NOT NULL AND region_id != '' ORDER BY name ASC;"
    );

    const divisionsResult = await db.query(
      "SELECT DISTINCT division_id AS id, region_id, division_id AS office_name FROM personnel_audits WHERE division_id IS NOT NULL AND division_id != '' ORDER BY office_name ASC;"
    );

    res.json({
      regions: regionsResult.rows,
      divisions: divisionsResult.rows
    });
  } catch (err) {
    console.error("Failed to load regions-divisions lookup:", err);
    res.status(500).json({ success: false, error: "Failed to fetch regional directories", message: err.message });
  }
});

/**
 * POST /api/auth/register
 * Enterprise registration endpoint with database transaction and Zod validation.
 */
router.post(
  ["/register", "/auth/register", "/api/auth/register", "/insighted-dpa/api/auth/register"],
  validateBody(RegisterSchema),
  async (req, res) => {
    const client = await db.pool.connect();
    try {
      const payload = req.validatedBody || req.body;
      const {
        region_id,
        division_id,
        position,
        first_name,
        last_name,
        deped_email,
        password,
        passcode = "123456",
        role = "HRMO"
      } = payload;

      const finalPasscode = (passcode && passcode.trim()) ? passcode.trim() : "123456";
      const cleanEmail = deped_email.trim().toLowerCase();

      const normalizedRole = (role || "HRMO").toUpperCase();
      if (!["HRMO", "COLLABORATOR", "ADMIN"].includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          error: "Invalid role specified. Role must be HRMO, COLLABORATOR, or ADMIN."
        });
      }

      await client.query("BEGIN");

      const emailCheck = await client.query("SELECT id FROM users WHERE deped_email = $1", [cleanEmail]);
      if (emailCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          error: "An account with this DepEd email address already exists."
        });
      }

      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const insertUserSql = `
        INSERT INTO users (region_id, division_id, position, first_name, last_name, deped_email, password_hash, passcode, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, region_id, division_id, position, first_name, last_name, deped_email, role, is_active, created_at;
      `;
      const userRes = await client.query(insertUserSql, [
        region_id.trim(),
        division_id.trim(),
        position.trim(),
        first_name.trim(),
        last_name.trim(),
        cleanEmail,
        password_hash,
        finalPasscode,
        normalizedRole
      ]);
      const user = userRes.rows[0];

      await client.query("COMMIT");

      const token = jwt.sign(
        {
          id: user.id,
          deped_email: user.deped_email,
          role: user.role,
          region_id: user.region_id,
          division_id: user.division_id,
          first_name: user.first_name,
          last_name: user.last_name
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      return res.status(201).json({
        success: true,
        message: "User account registered successfully.",
        data: {
          user,
          token
        }
      });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error during user registration:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/auth/login
 * User authentication endpoint with Zod validation.
 */
router.post(
  ["/login", "/auth/login", "/api/auth/login", "/insighted-dpa/api/auth/login"],
  validateBody(LoginSchema),
  async (req, res) => {
    try {
      const payload = req.validatedBody || req.body;
      const { deped_email, password } = payload;
      const cleanEmail = deped_email.trim().toLowerCase();

      const userRes = await db.query(
        `SELECT id, region_id, division_id, position, first_name, last_name, deped_email, password_hash, passcode, role, is_active 
         FROM users WHERE deped_email = $1`,
        [cleanEmail]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials. Account not found."
        });
      }

      const user = userRes.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          error: "Account is deactivated. Please contact your HRMO administrator."
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials. Incorrect password."
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          deped_email: user.deped_email,
          role: user.role,
          region_id: user.region_id,
          division_id: user.division_id,
          first_name: user.first_name,
          last_name: user.last_name
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      delete user.password_hash;

      return res.status(200).json({
        success: true,
        message: "Authentication successful.",
        data: {
          user,
          token
        }
      });

    } catch (error) {
      console.error("Error during user login:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: error.message
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Profile details for authenticated session.
 */
router.get(["/me", "/auth/me", "/api/auth/me", "/insighted-dpa/api/auth/me"], verifyToken, async (req, res) => {
  try {
    const userRes = await db.query(
      `SELECT id,
              region_id,
              region_id   AS region_name,
              division_id,
              division_id AS division_office_name,
              position, first_name, last_name, deped_email, role, is_active, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User profile not found." });
    }

    return res.status(200).json({
      success: true,
      data: userRes.rows[0]
    });
  } catch (error) {
    console.error("Error retrieving profile:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

export default router;
