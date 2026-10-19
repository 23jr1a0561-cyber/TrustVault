
const crypto = require("crypto");
const AuditLog = require("../models/AuditLog");

async function recordAudit({
  actor = null,
  action,
  document = null,
  targetUser = null,
  outcome,
  details = "",
}) {
  const previousEntry = await AuditLog.findOne()
    .sort({ createdAt: -1, _id: -1 })
    .select("entryHash")
    .lean();

  const previousHash = previousEntry?.entryHash || "GENESIS";

  const entryData = {
    actor,
    action,
    document,
    targetUser,
    outcome,
    details,
    previousHash,
  };

  const entryHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(entryData))
    .digest("hex");

  return AuditLog.create({
    ...entryData,
    entryHash,
  });
}

module.exports = { recordAudit };
