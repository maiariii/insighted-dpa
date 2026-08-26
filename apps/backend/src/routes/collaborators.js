import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/index.js";
import { validateBody } from "../middleware/validate.js";
import { CollaboratorInviteSchema } from "@project/shared";
import { verifyToken } from "./auth.js";

const router = express.Router();

/**
 * POST /api/collaborators/invite
 * Invite a collaborator with Zod validation.
 */
router.post(
  ["/invite", "/collaborators/invite", "/api/collaborators/invite", "/insighted-dpa/api/collaborators/invite"],
  verifyToken,
  validateBody(CollaboratorInviteSchema),
  async (req, res) => {
    const payload = req.validatedBody || req.body;
    const { first_name, last_name, position, email, region_id: payloadRegion, division_id: payloadDivision } = payload;

    const normalizedEmail = email.trim().toLowerCase();
    const hostUserId = req.user.id || req.user.userId;

    try {
      const hostUserRes = await db.query(
        "SELECT id, region_id, division_id FROM users WHERE id = $1 OR deped_email = $2 LIMIT 1;",
        [hostUserId, req.user.deped_email || req.user.email]
      );

      if (hostUserRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Host HRMO account not found." });
      }

      const hostUser = hostUserRes.rows[0];
      const regionId = payloadRegion || hostUser.region_id;
      const divisionId = payloadDivision || hostUser.division_id;

      const defaultPasswordHash = await bcrypt.hash("123456", 10);

      const collabRes = await db.query(
        `INSERT INTO collaborators (first_name, last_name, position, email, region_id, division_id, host_hrmo_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
         RETURNING id, first_name, last_name, position, email, region_id, division_id, status, created_at;`,
        [first_name.trim(), last_name.trim(), position ? position.trim() : "", normalizedEmail, regionId, divisionId, hostUser.id]
      );

      const collaborator = collabRes.rows[0];

      await db.query(
        `INSERT INTO users (first_name, last_name, position, deped_email, password_hash, passcode, role, region_id, division_id)
         VALUES ($1, $2, $3, $4, $5, '123456', 'COLLABORATOR', $6, $7)
         ON CONFLICT (deped_email) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           position = EXCLUDED.position,
           password_hash = EXCLUDED.password_hash,
           passcode = '123456',
           role = 'COLLABORATOR',
           region_id = EXCLUDED.region_id,
           division_id = EXCLUDED.division_id;`,
        [
          first_name.trim(),
          last_name.trim(),
          position ? position.trim() : "Collaborator",
          normalizedEmail,
          defaultPasswordHash,
          regionId,
          divisionId
        ]
      );

      return res.json({
        success: true,
        message: `Collaborator ${first_name} ${last_name} invited successfully! Default login password is 123456.`,
        collaborator
      });
    } catch (err) {
      console.error("Failed to invite collaborator:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to invite collaborator" });
    }
  }
);

/**
 * GET /api/collaborators
 * Fetch list of active collaborators for the host HRMO scope.
 */
router.get(["/", "/collaborators", "/api/collaborators", "/insighted-dpa/api/collaborators"], verifyToken, async (req, res) => {
  const hostUserId = req.user.id || req.user.userId;

  try {
    const hostUserRes = await db.query(
      "SELECT id, region_id, division_id FROM users WHERE id = $1 OR deped_email = $2 LIMIT 1;",
      [hostUserId, req.user.deped_email || req.user.email]
    );

    if (hostUserRes.rows.length === 0) {
      return res.json({ success: true, collaborators: [] });
    }

    const hostUser = hostUserRes.rows[0];

    const collabRes = await db.query(
      `SELECT id, first_name, last_name, position, email, region_id, division_id, status, created_at
       FROM collaborators
       WHERE host_hrmo_id = $1 OR (region_id = $2 AND division_id = $3)
       ORDER BY created_at DESC;`,
      [hostUser.id, hostUser.region_id, hostUser.division_id]
    );

    return res.json({
      success: true,
      collaborators: collabRes.rows
    });
  } catch (err) {
    console.error("Failed to fetch collaborators:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch collaborators list" });
  }
});

/**
 * DELETE /api/collaborators/:id
 * Remove/revoke a collaborator record.
 */
router.delete(["/:id", "/collaborators/:id", "/api/collaborators/:id"], verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const collabRes = await db.query("SELECT email FROM collaborators WHERE id = $1 LIMIT 1;", [id]);
    if (collabRes.rows.length > 0) {
      const email = collabRes.rows[0].email;
      await db.query("DELETE FROM collaborators WHERE id = $1;", [id]);
      await db.query("DELETE FROM users WHERE deped_email = $1 AND role = 'COLLABORATOR';", [email]);
    }

    return res.json({ success: true, message: "Collaborator removed successfully." });
  } catch (err) {
    console.error("Failed to remove collaborator:", err);
    return res.status(500).json({ success: false, error: "Failed to remove collaborator" });
  }
});

export default router;
