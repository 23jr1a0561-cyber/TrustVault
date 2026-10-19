const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const auditRoutes = require("./routes/auditRoutes");
const documentRoutes = require("./routes/documentRoutes");

const app = express();

app.disable("x-powered-by");

// Security headers
app.use(helmet());

// Frontend access
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5174",
  })
);

// Parse JSON requests
app.use(express.json({ limit: "20kb" }));

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  })
);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "TrustVault API is running",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Audit routes
app.use("/api/audit", auditRoutes);

// Document routes
app.use("/api/documents", documentRoutes);

module.exports = app;