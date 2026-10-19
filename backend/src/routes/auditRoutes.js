const express = require("express");
const AuditLog = require("../models/AuditLog");
require("../models/Document");
const authenticateToken = require("../middleware/auth");
const { verifyAuditChain } = require("../services/verifyAuditService");

const router = express.Router();

// View audit logs — admin only
router.get("/", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const logs = await AuditLog.find()
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

// Verify audit chain — admin only
router.get("/verify", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

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