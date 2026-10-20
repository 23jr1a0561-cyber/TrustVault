
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const allowedTypes = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "text/plain": [".txt"],
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const extensions = allowedTypes[file.mimetype];

  if (!extensions || !extensions.includes(extension)) {
    return cb(
      new Error("Only PDF, JPEG, PNG, and TXT files are allowed.")
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

// Validate actual file contents after Multer writes the file.
const validateFileSignature = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const filePath = req.file.path;

  try {
    const fd = fs.openSync(filePath, "r");
    const header = Buffer.alloc(8);
    let bytesRead;

    try {
      bytesRead = fs.readSync(fd, header, 0, 8, 0);
    } finally {
      fs.closeSync(fd);
    }

    const signature = header.subarray(0, bytesRead);
    const mimeType = req.file.mimetype;

    let valid = false;

    if (mimeType === "application/pdf") {
      valid = signature.subarray(0, 5).toString("ascii") === "%PDF-";
    } else if (mimeType === "image/png") {
      valid =
        signature.length >= 8 &&
        signature.equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        );
    } else if (mimeType === "image/jpeg") {
      valid =
        signature.length >= 3 &&
        signature[0] === 0xff &&
        signature[1] === 0xd8 &&
        signature[2] === 0xff;
    } else if (mimeType === "text/plain") {
      // Reject empty files and binary/control bytes.
      const content = fs.readFileSync(filePath);
      valid =
        content.length > 0 &&
        !content.includes(0) &&
        !content.some(
          (byte) =>
            (byte < 0x20 &&
              byte !== 0x09 &&
              byte !== 0x0a &&
              byte !== 0x0d &&
              byte !== 0x0c) ||
            byte === 0x7f
        );
    }

    if (!valid) {
      fs.unlink(filePath, (error) => {
        if (error && error.code !== "ENOENT") {
          console.error("Failed to remove rejected upload:", error.message);
        }

        return res.status(400).json({
          message: "File content does not match the declared file type.",
        });
      });

      return;
    }

    next();
  } catch (error) {
    fs.unlink(filePath, () => {
      return res.status(400).json({
        message: "Unable to validate the uploaded file.",
      });
    });
  }
};

module.exports = upload;
module.exports.validateFileSignature = validateFileSignature;
