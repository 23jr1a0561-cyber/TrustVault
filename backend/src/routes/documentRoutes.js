
const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const Document = require("../models/Document");
const Permission = require("../models/Permission");
const User = require("../models/User");
const authenticateToken = require("../middleware/auth");
const upload = require("../middleware/upload");
const { recordAudit } = require("../services/auditService");

const router = express.Router();

// Check document ownership or active permission
async function getDocumentAccess(documentId, userId) {
  if (!/^[a-f\d]{24}$/i.test(documentId)) {
    return { document: null, accessLevel: null };
  }

  const document = await Document.findById(documentId);

  if (!document) {
    return { document: null, accessLevel: null };
  }

  if (document.owner.toString() === userId.toString()) {
    return { document, accessLevel: "owner" };
  }

  const permission = await Permission.findOne({
    document: document._id,
    grantedTo: userId,
    revokedAt: null,
  }).sort({ createdAt: -1 });

  return {
    document,
    accessLevel: permission ? permission.accessLevel : null,
  };
}

// Upload a document
router.post(
  "/upload",
  authenticateToken,
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message || "File upload failed",
        });
      }
      next();
    });
  },
  async (req, res) => {
    let savedFilePath = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select a file to upload",
        });
      }

      savedFilePath = req.file.path;

      const { name, category = "General", description = "" } = req.body;

      if (typeof name !== "string" || !name.trim()) {
        await fs.unlink(savedFilePath).catch(() => {});
        savedFilePath = null;

        return res.status(400).json({
          message: "Document name is required",
        });
      }

      if (
        typeof category !== "string" ||
        typeof description !== "string"
      ) {
        await fs.unlink(savedFilePath).catch(() => {});
        savedFilePath = null;

        return res.status(400).json({
          message: "Invalid category or description",
        });
      }

      const document = await Document.create({
        name: name.trim().slice(0, 150),
        originalName: path.basename(req.file.originalname),
        storageKey: path.basename(req.file.filename),
        mimeType: req.file.mimetype,
        size: req.file.size,
        category: category.trim().slice(0, 100) || "General",
        description: description.trim().slice(0, 500),
        owner: req.user.id,
      });

      await recordAudit({
        actor: req.user.id,
        action: "UPLOAD",
        document: document._id,
        outcome: "SUCCESS",
        details: "Document uploaded",
      });

      savedFilePath = null;

      return res.status(201).json({
        message: "Document uploaded successfully",
        document: {
          id: document._id,
          name: document.name,
          originalName: document.originalName,
          mimeType: document.mimeType,
          size: document.size,
          category: document.category,
          description: document.description,
          createdAt: document.createdAt,
        },
      });
    } catch (error) {
      console.error("Document upload error:", error.stack || error);

      if (savedFilePath) {
        await fs.unlink(savedFilePath).catch(() => {});
      }

      return res.status(500).json({
        message: "Unable to upload document",
      });
    }
  }
);

// List owned and shared documents
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [owned, permissions] = await Promise.all([
      Document.find({ owner: req.user.id }).lean(),
      Permission.find({
        grantedTo: req.user.id,
        revokedAt: null,
      })
        .select("document accessLevel createdAt")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Keep only the latest active permission per document
    const permissionMap = new Map();

    for (const permission of permissions) {
      const id = permission.document.toString();

      if (!permissionMap.has(id)) {
        permissionMap.set(id, permission.accessLevel);
      }
    }

    const sharedIds = [...permissionMap.keys()].filter(
      (id) => !owned.some((doc) => doc._id.toString() === id)
    );

    const shared = sharedIds.length
      ? await Document.find({
          _id: { $in: sharedIds },
          owner: { $ne: req.user.id },
        }).lean()
      : [];

    const documents = [
      ...owned.map((doc) => ({
        ...doc,
        accessLevel: "owner",
      })),
      ...shared.map((doc) => ({
        ...doc,
        accessLevel: permissionMap.get(doc._id.toString()) || "read",
      })),
    ];

    return res.json({ documents });
  } catch (error) {
    console.error("List documents error:", error.stack || error);

    return res.status(500).json({
      message: "Unable to retrieve documents",
    });
  }
});

// Grant or update read/edit permission — owner only
router.post("/:id/permissions", authenticateToken, async (req, res) => {
  try {
    const { document } = await getDocumentAccess(
      req.params.id,
      req.user.id
    );

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    if (document.owner.toString() !== req.user.id.toString()) {
      await recordAudit({
        actor: req.user.id,
        action: "ACCESS_DENIED",
        document: document._id,
        outcome: "DENIED",
        details: "Non-owner attempted to grant permission",
      });

      return res.status(403).json({
        message: "Only the document owner can grant permissions",
      });
    }

    const { email, accessLevel } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      !["read", "edit"].includes(accessLevel)
    ) {
      return res.status(400).json({
        message: "Valid email and accessLevel (read/edit) are required",
      });
    }

    const targetUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!targetUser) {
      return res.status(404).json({
        message: "User with that email was not found",
      });
    }

    if (targetUser._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        message: "You already own this document",
      });
    }

    const permission = await Permission.findOneAndUpdate(
      {
        document: document._id,
        grantedTo: targetUser._id,
        revokedAt: null,
      },
      {
        $set: {
          grantedBy: req.user.id,
          accessLevel,
        },
        $setOnInsert: {
          document: document._id,
          grantedTo: targetUser._id,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    await recordAudit({
      actor: req.user.id,
      action: "PERMISSION_GRANTED",
      document: document._id,
      targetUser: targetUser._id,
      outcome: "SUCCESS",
      details: `Granted ${accessLevel} access`,
    });

    return res.status(200).json({
      message: "Permission granted successfully",
      permission,
    });
  } catch (error) {
    console.error("Grant permission error:", error.stack || error);

    return res.status(500).json({
      message: "Unable to grant permission",
    });
  }
});

// Revoke active permission — owner only
router.delete(
  "/:id/permissions/:userId",
  authenticateToken,
  async (req, res) => {
    try {
      const { document } = await getDocumentAccess(
        req.params.id,
        req.user.id
      );

      if (!document) {
        return res.status(404).json({
          message: "Document not found",
        });
      }

      if (document.owner.toString() !== req.user.id.toString()) {
        await recordAudit({
          actor: req.user.id,
          action: "ACCESS_DENIED",
          document: document._id,
          outcome: "DENIED",
          details: "Non-owner attempted to revoke permission",
        });

        return res.status(403).json({
          message: "Only the document owner can revoke permissions",
        });
      }

      if (!/^[a-f\d]{24}$/i.test(req.params.userId)) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const permission = await Permission.findOneAndUpdate(
        {
          document: document._id,
          grantedTo: req.params.userId,
          revokedAt: null,
        },
        {
          $set: { revokedAt: new Date() },
        },
        { new: true }
      );

      if (!permission) {
        return res.status(404).json({
          message: "Active permission not found",
        });
      }

      await recordAudit({
        actor: req.user.id,
        action: "PERMISSION_REVOKED",
        document: document._id,
        targetUser: req.params.userId,
        outcome: "SUCCESS",
        details: "Document permission revoked",
      });

      return res.json({
        message: "Permission revoked successfully",
      });
    } catch (error) {
      console.error("Revoke permission error:", error.stack || error);

      return res.status(500).json({
        message: "Unable to revoke permission",
      });
    }
  }
);

module.exports = router;
