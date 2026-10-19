require("dotenv").config();

const mongoose = require("mongoose");
const { recordAudit } = require("./services/auditService");

async function testAudit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const entry = await recordAudit({
      action: "VIEW",
      outcome: "SUCCESS",
      details: "TrustVault audit service test",
    });

    console.log("Audit entry created successfully!");
    console.log("Action:", entry.action);
    console.log("Outcome:", entry.outcome);
    console.log("Entry hash:", entry.entryHash);
  } catch (error) {
    console.error("Audit test failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testAudit();