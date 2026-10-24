const express = require("express");
const AuditLog = require("../models/AuditLog");
require("../models/Document");
const authenticateToken = require("../middleware/auth");
const { verifyAuditChain } = require("../services/verifyAuditService");

const router = express.Router();

// View audit logs
// Admin sees all logs; other users see only their own logs
router.get("/", authenticateToken, async (req, res) => {
  try {
    const filter =
      req.user.role === "admin"
        ? {}
        : { actor: req.user.id };

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(100)
      .populate("actor", "name email")
      .populate("document", "name")
      .populate("targetUser", "name email")
      .lean();

    return res.status(200).json({ logs });
  } catch (error) {
    console.error("Audit logs error:", error.stack || error);

    return res.status(500).json({
      message: error.message || "Unable to retrieve audit logs",
    });
  }
});

// Verify audit chain — authenticated users can verify integrity
router.get("/verify", authenticateToken, async (req, res) => {
  try {
    const result = await verifyAuditChain();

    return res.status(result.valid ? 200 : 409).json(result);
  } catch (error) {
    console.error("Audit verification error:", error.stack || error);

    return res.status(500).json({
      message: "Audit verification failed",
    });
  }
});

module.exports = router;
