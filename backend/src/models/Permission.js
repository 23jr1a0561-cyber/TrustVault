
const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    grantedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accessLevel: {
      type: String,
      enum: ["read", "edit"],
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

permissionSchema.index({
  document: 1,
  grantedTo: 1,
  revokedAt: 1,
});

module.exports = mongoose.model("Permission", permissionSchema);
