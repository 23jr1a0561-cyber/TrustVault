const crypto = require("crypto");
const AuditLog = require("../models/AuditLog");

async function verifyAuditChain() {
  const entries = await AuditLog.find()
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  let expectedPreviousHash = "GENESIS";

  for (const entry of entries) {
    if (entry.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        failedEntry: entry._id,
        reason: "Previous hash mismatch",
      };
    }

    const entryData = {
      actor: entry.actor ?? null,
      action: entry.action,
      document: entry.document ?? null,
      targetUser: entry.targetUser ?? null,
      outcome: entry.outcome,
      details: entry.details ?? "",
      previousHash: entry.previousHash,
    };

    const expectedHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(entryData))
      .digest("hex");

    if (entry.entryHash !== expectedHash) {
      return {
        valid: false,
        failedEntry: entry._id,
        reason: "Entry hash mismatch",
      };
    }

    expectedPreviousHash = entry.entryHash;
  }

  return {
    valid: true,
    entriesChecked: entries.length,
  };
}

module.exports = { verifyAuditChain };