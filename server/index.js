const express = require("express");
const path = require("path");
const db = require("./db");
const dpaRouter = require("./routes/dpa");
const authRouter = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Attach DB client pool to Express application instance
app.set("dbClient", db.pool);

// Enable CORS for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Authorization, Accept");
  next();
});

// Serve static assets from project root
app.use(express.static(path.join(__dirname, "..")));

// Mount Auth & DPA API routes
app.use("/api/auth", authRouter);
app.use("/api/personnel-audit", dpaRouter);

// Serve dashboard HTML at root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "dpa.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error"
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    const cyanUnderline = "\x1b[36m\x1b[4m";
    const reset = "\x1b[0m";
    const bold = "\x1b[1m";

    console.log(`\n${bold}🚀 Server listening on port ${PORT}${reset}`);
    console.log(`> Local: ${cyanUnderline}http://localhost:${PORT}${reset}\n`);
  });
}

module.exports = app;
