import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import db, { pool } from "./db/index.js";
import dpaRouter from "./routes/dpa.js";
import authRouter from "./routes/auth.js";
import collaboratorsRouter from "./routes/collaborators.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Attach DB client pool to Express application instance
app.set("dbClient", pool);

// Execute database schema migrations on server startup
if (db && typeof db.runMigration === "function") {
  db.runMigration().catch(err => {
    console.error("Failed to run DB auto-migration on startup:", err);
  });
}


// Normalize /insighted-dpa subpath prefix for incoming requests
app.use((req, res, next) => {
  if (req.url.startsWith("/insighted-dpa")) {
    req.url = req.url.replace(/^\/insighted-dpa/, "") || "/";
  }
  next();
});

// Enable robust JSON & URL-encoded body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable CORS for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Authorization, Accept");
  next();
});

// Serve compiled React application static assets & public assets
const frontendDist = path.join(__dirname, "../../frontend/dist");
const rootPublic = path.join(__dirname, "../../../public");

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}
if (fs.existsSync(rootPublic)) {
  app.use(express.static(rootPublic));
}

// Mount Auth, DPA, and Collaborator API routers cleanly across all path variations
app.use("/api/auth", authRouter);
app.use("/auth", authRouter);
app.use("/insighted-dpa/api/auth", authRouter);

app.use("/api/personnel-audit", dpaRouter);
app.use("/personnel-audit", dpaRouter);
app.use("/insighted-dpa/api/personnel-audit", dpaRouter);

app.use("/api/collaborators", collaboratorsRouter);
app.use("/collaborators", collaboratorsRouter);
app.use("/insighted-dpa/api/collaborators", collaboratorsRouter);

// Fallback: Return React SPA index.html for all non-API client routes
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/auth/") || req.path.startsWith("/personnel-audit/") || req.path.startsWith("/collaborators/")) {
    return next();
  }
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const distHtml = path.join(frontendDist, "index.html");
  if (fs.existsSync(distHtml)) {
    return res.sendFile(distHtml);
  }
  next();
});


// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Cannot ${req.method} ${req.url}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err && (err.type === "entity.parse.failed" || err instanceof SyntaxError)) {
    return res.status(400).json({
      success: false,
      error: "Invalid request payload format."
    });
  }
  console.error("Unhandled Server Error:", err);
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    error: err.message || "Internal Server Error"
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    const cyanUnderline = "\x1b[36m\x1b[4m";
    const reset = "\x1b[0m";
    const bold = "\x1b[1m";

    console.log(`\n${bold}🚀 Server listening on port ${PORT}${reset}`);
    console.log(`> Local: ${cyanUnderline}http://localhost:${PORT}${reset}\n`);
  });
}

export default app;
