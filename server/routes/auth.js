const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "STRIDE_INSIGHTED_SECRET_2026_KEY_PROD";

/**
 * Middleware: Verify JWT Bearer Token
 */
function verifyToken(req, res, next) {
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
    const regionsResult = await db.query("SELECT id, name FROM regions ORDER BY name ASC;");
    const divisionsResult = await db.query("SELECT id, region_id, office_name FROM division_offices ORDER BY office_name ASC;");
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
 * Enterprise registration endpoint with database transaction.
 */
router.post(["/register", "/auth/register", "/api/auth/register", "/insighted-dpa/api/auth/register"], async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      region_id,
      division_id,
      position,
      first_name,
      last_name,
      deped_email,
      password,
      passcode = "123456",
      role = "HRMO",
      host_hrmo_id
    } = req.body;

    const finalPasscode = (passcode && passcode.trim()) ? passcode.trim() : "123456";

    // 1. Mandatory Input Validation
    if (!region_id || !division_id || !position || !first_name || !last_name || !deped_email || !password) {
      return res.status(400).json({
        success: false,
        error: "Missing required registration fields. All parameters (region_id, division_id, position, first_name, last_name, deped_email, password) are required."
      });
    }

    // 2. Application Layer DepEd Email Domain Check
    const cleanEmail = deped_email.trim().toLowerCase();
    if (!cleanEmail.endsWith("@deped.gov.ph") && !cleanEmail.endsWith(".deped.gov.ph")) {
      return res.status(400).json({
        success: false,
        error: "Invalid DepEd email domain. Registration is strictly restricted to official @deped.gov.ph addresses."
      });
    }

    const normalizedRole = role.toUpperCase();
    if (!["HRMO", "COLLABORATOR", "ADMIN"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role specified. Role must be HRMO, COLLABORATOR, or ADMIN."
      });
    }

    // Begin DB Transaction
    await client.query("BEGIN");

    // Check email uniqueness
    const emailCheck = await client.query("SELECT id FROM users WHERE deped_email = $1", [cleanEmail]);
    if (emailCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        error: "An account with this DepEd email address already exists."
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert into `users` table directly with plain-text geography names
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

    // Sign JWT Token
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
});

/**
 * POST /api/auth/login
 * User authentication endpoint
 */
router.post(["/login", "/auth/login", "/api/auth/login", "/insighted-dpa/api/auth/login"], async (req, res) => {
  try {
    const { deped_email, password } = req.body;

    if (!deped_email || !password) {
      return res.status(400).json({
        success: false,
        error: "DepEd email and password are required for login."
      });
    }

    const cleanEmail = deped_email.trim().toLowerCase();

    // Query user record
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

    // Compare bcrypt password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials. Incorrect password."
      });
    }

    // Generate JWT Token
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

    // Omit sensitive hashes from response payload
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
});

/**
 * GET /api/auth/me
 * Profile details for authenticated session.
 * region_id and division_id are plain-text VARCHAR — no relational JOINs needed.
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

module.exports = router;
module.exports.verifyToken = verifyToken;
