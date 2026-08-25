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
 * POST /api/auth/register
 * Enterprise registration endpoint with database transaction.
 */
router.post("/register", async (req, res) => {
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
      passcode,
      role = "COLLABORATOR",
      host_hrmo_id
    } = req.body;

    // 1. Mandatory Input Validation
    if (!region_id || !division_id || !position || !first_name || !last_name || !deped_email || !password || !passcode) {
      return res.status(400).json({
        success: false,
        error: "Missing required registration fields. All parameters (region_id, division_id, position, first_name, last_name, deped_email, password, passcode) are required."
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

    if (normalizedRole === "COLLABORATOR" && !host_hrmo_id) {
      return res.status(400).json({
        success: false,
        error: "Host HRMO ID is required when registering a Collaborator profile."
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

    let targetRegionId = region_id;
    let targetDivisionId = division_id;

    // If Collaborator, verify host HRMO and dynamically adopt host regional boundaries
    if (normalizedRole === "COLLABORATOR") {
      const hrmoRes = await client.query("SELECT id, region_id, division_id FROM host_hrmos WHERE id = $1", [host_hrmo_id]);
      if (hrmoRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: "Specified Host HRMO record does not exist."
        });
      }
      const hostHrmo = hrmoRes.rows[0];
      targetRegionId = hostHrmo.region_id;
      targetDivisionId = hostHrmo.division_id;
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert into `users` table
    const insertUserSql = `
      INSERT INTO users (region_id, division_id, position, first_name, last_name, deped_email, password_hash, passcode, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, region_id, division_id, position, first_name, last_name, deped_email, role, is_active, created_at;
    `;
    const userRes = await client.query(insertUserSql, [
      targetRegionId,
      targetDivisionId,
      position.trim(),
      first_name.trim(),
      last_name.trim(),
      cleanEmail,
      password_hash,
      passcode.trim(),
      normalizedRole
    ]);
    const user = userRes.rows[0];

    // Role-specific profile table insertion
    if (normalizedRole === "HRMO") {
      await client.query(
        "INSERT INTO host_hrmos (user_id, region_id, division_id) VALUES ($1, $2, $3)",
        [user.id, user.region_id, user.division_id]
      );
    } else if (normalizedRole === "COLLABORATOR") {
      await client.query(
        "INSERT INTO collaborators (user_id, host_hrmo_id, region_id, division_id) VALUES ($1, $2, $3, $4)",
        [user.id, host_hrmo_id, user.region_id, user.division_id]
      );
    }

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
router.post("/login", async (req, res) => {
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
 * Profile details for authenticated session
 */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userRes = await db.query(
      `SELECT u.id, u.region_id, r.name as region_name, u.division_id, d.office_name as division_office_name,
              u.position, u.first_name, u.last_name, u.deped_email, u.role, u.is_active, u.created_at
       FROM users u
       JOIN regions r ON u.region_id = r.id
       JOIN division_offices d ON u.division_id = d.id
       WHERE u.id = $1`,
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
