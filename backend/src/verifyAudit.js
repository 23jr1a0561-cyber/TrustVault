
require("dotenv").config();

const mongoose = require("mongoose");
const AuditLog = require("./models/AuditLog");
const { verifyAuditChain } = require("./services/verifyAuditService");

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const result = await verifyAuditChain();

    console.log("\nAudit Chain Verification:");
    console.log(result);

    console.log("\nRecent Audit Actions:");

    const entries = await AuditLog.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .select("action outcome details createdAt")
      .lean();

    for (const entry of entries) {
      console.log({
        action: entry.action,
        outcome: entry.outcome,
        details: entry.details,
        createdAt: entry.createdAt,
      });
    }
  } catch (error) {
    console.error("Verification failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();
