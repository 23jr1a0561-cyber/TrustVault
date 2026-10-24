
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const auditRoutes = require("./routes/auditRoutes");
const documentRoutes = require("./routes/documentRoutes");

const app = express();

// Trust Render's reverse proxy for client IP detection
app.set("trust proxy", 1);

app.disable("x-powered-by");

// Security headers
app.use(helmet());

// Allow local development and deployed frontend
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://trustvault-1-o1iu.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
