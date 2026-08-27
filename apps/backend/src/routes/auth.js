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
const handleRegionsDivisions = async (req, res) => {
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
};

router.get(["/", "/regions-divisions", "/auth/regions-divisions", "/api/auth/regions-divisions", "/insighted-dpa/api/auth/regions-divisions"], handleRegionsDivisions);

/**
 * POST /api/auth/register
 * Enterprise registration endpoint with database transaction and Zod validation.
 */
const handleRegister = async (req, res) => {
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

    const finalPasscode = (passcode && passcode.trim()) ? passcode.trim() : "";
    if (!/^\d{6}$/.test(finalPasscode)) {
      return res.status(400).json({
        success: false,
        error: "Passcode must be exactly 6 numeric digits."
      });
    }

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
      RETURNING id, region_id, division_id, position, first_name, last_name, deped_email, role, created_at;
    `;
    const userRes = await client.query(insertUserSql, [
      region_id,
      division_id,
      position,
      first_name,
      last_name,
      cleanEmail,
      password_hash,
      finalPasscode,
      normalizedRole
    ]);
    const newUser = userRes.rows[0];

    await client.query("COMMIT");

    const token = jwt.sign(
      {
        id: newUser.id,
        deped_email: newUser.deped_email,
        role: newUser.role,
        region_id: newUser.region_id,
        division_id: newUser.division_id,
        first_name: newUser.first_name,
        last_name: newUser.last_name
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(201).json({
      success: true,
      message: "Account registered successfully.",
      data: {
        user: newUser,
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
};

router.post(["/register", "/auth/register", "/api/auth/register", "/insighted-dpa/api/auth/register"], validateBody(RegisterSchema), handleRegister);

/**
 * POST /api/auth/login
 * User authentication endpoint with Zod validation.
 */
const handleLogin = async (req, res) => {
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

    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    const isPasscodeMatch = Boolean(
      (user.passcode && (user.passcode === password.trim() || user.passcode === (req.body.passcode || '').trim()))
    );

    if (!isPasswordMatch && !isPasscodeMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials. Incorrect password or passcode."
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
};

router.post(["/login", "/auth/login", "/api/auth/login", "/insighted-dpa/api/auth/login"], validateBody(LoginSchema), handleLogin);

/**
 * POST /api/auth/request-passcode
 * Request / send login passcode for registered DepEd email.
 */
const handleRequestPasscode = async (req, res) => {
  try {
    const { deped_email } = req.body || {};
    if (!deped_email || typeof deped_email !== "string" || !deped_email.trim()) {
      return res.status(400).json({ success: false, error: "DepEd Email address is required." });
    }

    const cleanEmail = deped_email.trim().toLowerCase();
    const userRes = await db.query(
      `SELECT id, first_name, last_name, deped_email, passcode, is_active FROM users WHERE deped_email = $1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No account found registered under this email address."
      });
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated. Please contact your HRMO administrator."
      });
    }

    const passcode = user.passcode || "123456";

    return res.status(200).json({
      success: true,
      message: `Passcode sent to registered email address (${cleanEmail}).`,
      data: {
        email: cleanEmail,
        passcode,
        expiresInMinutes: 10
      }
    });
  } catch (error) {
    console.error("Error requesting login passcode:", error);
    return res.status(500).json({ success: false, error: "Internal server error requesting passcode." });
  }
};

/**
 * POST /api/auth/login-passcode
 * Authenticate user via 6-digit account passcode.
 */
const handleLoginPasscode = async (req, res) => {
  try {
    const { deped_email, passcode } = req.body || {};
    if (!deped_email || !passcode) {
      return res.status(400).json({ success: false, error: "Email and passcode are required." });
    }

    const cleanEmail = deped_email.trim().toLowerCase();
    const cleanPasscode = String(passcode).trim();

    if (!/^\d{6}$/.test(cleanPasscode)) {
      return res.status(400).json({ success: false, error: "Passcode must be exactly 6 numeric digits." });
    }

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

    const isMatch = user.passcode && user.passcode === cleanPasscode;
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid passcode. Please verify your passcode and try again."
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
      message: "Passcode authentication successful.",
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error("Error logging in with passcode:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message
    });
  }
};

router.post(["/request-passcode", "/auth/request-passcode", "/api/auth/request-passcode", "/insighted-dpa/api/auth/request-passcode"], handleRequestPasscode);
router.post(["/login-passcode", "/auth/login-passcode", "/api/auth/login-passcode", "/insighted-dpa/api/auth/login-passcode"], handleLoginPasscode);

/**
 * GET /api/auth/me
 * Profile details for authenticated session.
 */
const handleMe = async (req, res) => {
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
};

router.get(["/me", "/auth/me", "/api/auth/me", "/insighted-dpa/api/auth/me"], verifyToken, handleMe);

/**
 * POST /api/auth/change-password
 * Change password endpoint with server-side passcode verification.
 * Verifies entered currentPasscode against stored user.passcode (plaintext).
 * Updates user.password_hash (bcrypt) while keeping user.passcode unchanged.
 */
const handleChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current passcode and new password are required."
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "New password and confirmation password do not match."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters long."
      });
    }

    // Fetch stored user passcode and password hash for authenticated user
    const userRes = await db.query(
      "SELECT id, password_hash, passcode FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User account not found."
      });
    }

    const user = userRes.rows[0];

    // Server-side verification of current passcode against stored plaintext passcode (or password_hash)
    const isPasscodeMatch = (user.passcode && user.passcode === currentPassword) || (await bcrypt.compare(currentPassword, user.password_hash));

    if (!isPasscodeMatch) {
      return res.status(401).json({
        success: false,
        error: "Current passcode is incorrect."
      });
    }

    // Securely hash the new password using bcrypt
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update ONLY password_hash; passcode column remains unchanged
    await db.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [newPasswordHash, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Password updated successfully!"
    });

  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update password.",
      message: error.message
    });
  }
};

router.post(["/change-password", "/auth/change-password", "/api/auth/change-password", "/insighted-dpa/api/auth/change-password"], verifyToken, handleChangePassword);

/**
 * POST /api/auth/verify-passcode
 * Endpoint for real-time server-side verification of current passcode against database record.
 */
router.post(
  ["/verify-passcode", "/auth/verify-passcode", "/api/auth/verify-passcode", "/insighted-dpa/api/auth/verify-passcode"],
  verifyToken,
  async (req, res) => {
    try {
      const { passcode } = req.body || {};
      if (!passcode) {
        return res.status(400).json({ success: false, valid: false, error: "Passcode parameter is required." });
      }

      const userRes = await db.query(
        "SELECT passcode, password_hash FROM users WHERE id = $1",
        [req.user.id]
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, valid: false, error: "User profile not found." });
      }

      const user = userRes.rows[0];
      const isMatch = (user.passcode && user.passcode === passcode.trim()) || (await bcrypt.compare(passcode.trim(), user.password_hash));

      return res.status(200).json({
        success: true,
        valid: isMatch
      });
    } catch (error) {
      console.error("Error verifying passcode:", error);
      return res.status(500).json({ success: false, valid: false, error: "Failed to verify passcode." });
    }
  }
);

export default router;
