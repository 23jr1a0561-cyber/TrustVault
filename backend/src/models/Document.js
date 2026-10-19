
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    originalName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "text/plain",
      ],
    },
    size: {
      type: Number,
      required: true,
      min: 1,
      max: 10 * 1024 * 1024,
    },
    category: {
      type: String,
      default: "Other",
      trim: true,
      maxlength: 50,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

documentSchema.index({ name: "text", category: "text" });
documentSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Document", documentSchema);
