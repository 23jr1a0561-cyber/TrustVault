
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "REGISTER",
        "LOGIN",
        "UPLOAD",
        "DOWNLOAD",
        "VIEW",
        "UPDATE",
        "DELETE",
        "PERMISSION_GRANTED",
        "PERMISSION_REVOKED",
        "ACCESS_DENIED",
      ],
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    outcome: {
      type: String,
      enum: ["SUCCESS", "DENIED", "FAILURE"],
      required: true,
    },
    details: {
      type: String,
      default: "",
      maxlength: 500,
    },
    previousHash: {
      type: String,
      default: "GENESIS",
    },
    entryHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ document: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
