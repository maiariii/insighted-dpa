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

app.use(express.json());

// Attach DB client pool to Express application instance
app.set("dbClient", pool);

// Execute database schema migrations on server startup
if (typeof db.runMigration === "function") {
  db.runMigration().catch(err => {
    console.error("Failed to run DB auto-migration on startup:", err);
  });
}

// Enable CORS for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Authorization, Accept");
  next();
});

// Serve static assets from public directory and frontend directory
const rootPublic = path.join(__dirname, "../../../public");
const backendPublic = path.join(__dirname, "../public");
const frontendDir = path.join(__dirname, "../../frontend");
const rootDir = path.join(__dirname, "../../..");

if (fs.existsSync(rootPublic)) app.use(express.static(rootPublic, { index: false }));
if (fs.existsSync(backendPublic)) app.use(express.static(backendPublic, { index: false }));
if (fs.existsSync(frontendDir)) app.use(express.static(frontendDir, { index: false }));
app.use(express.static(rootDir, { index: false }));

// Mount Auth & DPA API routes with /api prefix
app.use("/api/auth", authRouter);
app.use("/api/personnel-audit", dpaRouter);
app.use("/api/collaborators", collaboratorsRouter);

// Direct mounts for backward compatibility
app.use("/auth", authRouter);
app.use("/personnel-audit", dpaRouter);
app.use("/collaborators", collaboratorsRouter);

// Serve dashboard application at root URL
app.get("/", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  
  const publicHtml = path.join(rootDir, "public", "index.html");
  const frontendHtml = path.join(frontendDir, "index.html");
  const fallbackHtml = path.join(rootDir, "index.html");
  if (fs.existsSync(publicHtml)) {
    res.sendFile(publicHtml);
  } else if (fs.existsSync(frontendHtml)) {
    res.sendFile(frontendHtml);
  } else {
    res.sendFile(fallbackHtml);
  }
});

// Redirect any legacy requests for dpa.html to root API status endpoint
app.get("/dpa.html", (req, res) => {
  res.redirect("/");
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
