import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import db from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Restrict this correction run to only these item_numbers, unlike the full-table
// pass in correct_item_status.js.
const TARGET_ITEM_NUMBERS = [
  "OSEC-DECSB-GUIDC1-30001-2008",
  "OSEC-DECSB-ADA1-31126-2004",
  "OSEC-DECSB-MTCHR1-30006-2009",
  "OSEC-DECSB-ADA4-30230-2004"
];

function parseCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

export async function correctItemStatusesTargeted() {
  const isCommit = process.argv.includes("--commit") || process.argv.includes("--apply");
  const modeName = isCommit ? "EXECUTE / COMMIT MODE" : "DRY-RUN / PREVIEW MODE";

  console.log("================================================================================");
  console.log(`🚀 PERSONNEL AUDITS ITEM_STATUS TARGETED CORRECTION (${modeName})`);
  console.log(`   Restricted to ${TARGET_ITEM_NUMBERS.length} item_number(s):`);
  TARGET_ITEM_NUMBERS.forEach(n => console.log(`     - ${n}`));
  console.log("================================================================================\n");

  const csvPath = path.join(__dirname, "../../../../2personnel_audits_202608251903.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("❌ Error: Source-of-truth CSV file not found at:", csvPath);
    process.exit(1);
  }

  console.log("1. Reading and parsing CSV file:", csvPath);
  const fileContent = fs.readFileSync(csvPath, "utf8");
  const rawLines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (rawLines.length < 2) {
    console.error("❌ CSV file is empty or missing data rows.");
    process.exit(1);
  }

  const rawHeaders = parseCsvLine(rawLines[0]);
  console.log(`  > Headers detected (${rawHeaders.length} columns):`, rawHeaders.join(", "));

  let itemNumIdx = rawHeaders.indexOf("item_number");
  let itemStatusIdx = rawHeaders.indexOf("item_status");

  if (itemNumIdx === -1) {
    itemNumIdx = rawHeaders.findIndex(h => h.toLowerCase().includes("item_number") || h.toLowerCase().includes("item number"));
  }
  if (itemStatusIdx === -1) {
    itemStatusIdx = rawHeaders.findIndex(h => h.toLowerCase().includes("item_status") || h.toLowerCase().includes("item status") || h.toLowerCase().includes("status"));
  }

  if (itemNumIdx === -1 || itemStatusIdx === -1) {
    console.error(`❌ Could not locate required columns in CSV! item_number index: ${itemNumIdx}, status index: ${itemStatusIdx}`);
    process.exit(1);
  }

  const confirmedItemNumCol = rawHeaders[itemNumIdx];
  const confirmedStatusCol = rawHeaders[itemStatusIdx];

  console.log(`  ✅ CONFIRMED MATCHING COLUMNS:`);
  console.log(`     - Item Number Column: "${confirmedItemNumCol}" (index ${itemNumIdx})`);
  console.log(`     - Item Status Column: "${confirmedStatusCol}" (index ${itemStatusIdx})`);

  const targetSet = new Set(TARGET_ITEM_NUMBERS);
  const csvMap = new Map();

  for (let i = 1; i < rawLines.length; i++) {
    const row = parseCsvLine(rawLines[i]);
    const itemNum = row[itemNumIdx];
    const itemStatus = row[itemStatusIdx];

    if (itemNum && targetSet.has(itemNum)) {
      csvMap.set(itemNum, itemStatus);
    }
  }

  console.log(`\n2. CSV lookup results for target item_number(s):`);
  const foundInCsv = [];
  const notFoundInCsv = [];
  TARGET_ITEM_NUMBERS.forEach(itemNum => {
    if (csvMap.has(itemNum)) {
      foundInCsv.push(itemNum);
      console.log(`  ✅ FOUND in CSV: "${itemNum}" -> item_status = "${csvMap.get(itemNum)}"`);
    } else {
      notFoundInCsv.push(itemNum);
      console.log(`  ⚠️  NOT FOUND in CSV: "${itemNum}" (will be skipped)`);
    }
  });

  console.log("\n3. Fetching matching records from personnel_audits database table...");
  const dbClient = await db.pool.connect();

  try {
    const dbRes = await dbClient.query(
      "SELECT id, item_number, item_status, position_title, is_audited, position_status FROM personnel_audits WHERE item_number = ANY($1::text[]);",
      [TARGET_ITEM_NUMBERS]
    );
    const dbRows = dbRes.rows;
    console.log(`  > DB records fetched for target item_numbers: ${dbRows.length} of ${TARGET_ITEM_NUMBERS.length}`);

    const foundInDb = new Set(dbRows.map(r => r.item_number));
    const notFoundInDb = TARGET_ITEM_NUMBERS.filter(n => !foundInDb.has(n));

    const rowsNeedingCorrection = [];
    const alreadyCorrect = [];

    for (const dbRow of dbRows) {
      const itemNum = dbRow.item_number;
      const currentDbStatus = dbRow.item_status;
      const csvStatus = csvMap.get(itemNum);

      if (csvStatus === undefined) {
        continue; // not in CSV, already flagged above
      }

      if (currentDbStatus !== csvStatus) {
        rowsNeedingCorrection.push({
          id: dbRow.id,
          item_number: itemNum,
          currentDbStatus,
          newCsvStatus: csvStatus,
          position_title: dbRow.position_title
        });
      } else {
        alreadyCorrect.push({ item_number: itemNum, item_status: currentDbStatus });
      }
    }

    console.log("\n================================================================================");
    console.log("📊 TARGETED MATCHING & CORRECTION SUMMARY");
    console.log("================================================================================");
    console.log(`  - Target item_numbers requested:           ${TARGET_ITEM_NUMBERS.length}`);
    console.log(`  - Found in CSV:                            ${foundInCsv.length}`);
    console.log(`  - Found in DB:                              ${dbRows.length}`);
    console.log(`  - Records needing status correction:       ${rowsNeedingCorrection.length}`);
    console.log(`  - Records already correct (no-op):         ${alreadyCorrect.length}`);

    if (notFoundInCsv.length > 0) {
      console.log("\n⚠️ FLAGGED: item_number(s) NOT FOUND in CSV (skipped, not updated):");
      notFoundInCsv.forEach((n, idx) => console.log(`   [${idx + 1}] ${n}`));
    }

    if (notFoundInDb.length > 0) {
      console.log("\n⚠️ FLAGGED: item_number(s) NOT FOUND in personnel_audits table (skipped):");
      notFoundInDb.forEach((n, idx) => console.log(`   [${idx + 1}] ${n}`));
    }

    if (alreadyCorrect.length > 0) {
      console.log("\n  ℹ️  Already-correct records (no update needed):");
      alreadyCorrect.forEach((r, idx) => console.log(`   [${idx + 1}] ${r.item_number} -> already "${r.item_status}"`));
    }

    if (rowsNeedingCorrection.length > 0) {
      console.log("\n📋 PROPOSED UPDATES:");
      rowsNeedingCorrection.forEach((r, idx) => {
        console.log(`   [${idx + 1}] Item: ${r.item_number.padEnd(32)} | DB Status: '${r.currentDbStatus}' -> New CSV Status: '${r.newCsvStatus}' | Title: ${r.position_title}`);
      });
    } else {
      console.log("\n  ✨ No corrections needed — all matched target records already have their correct item_status.");
    }

    console.log("\n================================================================================");
    console.log(`4. Running updates inside database transaction (${modeName})...`);

    await dbClient.query("BEGIN;");

    let updatedCount = 0;
    if (rowsNeedingCorrection.length > 0) {
      for (const item of rowsNeedingCorrection) {
        const updateRes = await dbClient.query(
          "UPDATE personnel_audits SET item_status = $1, updated_at = NOW() WHERE item_number = $2 RETURNING id;",
          [item.newCsvStatus, item.item_number]
        );
        updatedCount += updateRes.rowCount;
      }
    }

    if (isCommit) {
      await dbClient.query("COMMIT;");
      console.log(`\n✅ TRANSACTION COMMITTED SUCCESSFULLY! ${updatedCount} row(s) updated in database.`);
    } else {
      await dbClient.query("ROLLBACK;");
      console.log(`\n🔍 PREVIEW MODE COMPLETE (ROLLBACK EXECUTED).`);
      console.log(`   ${updatedCount} proposed row update(s) were tested cleanly in transaction.`);
      console.log(`   No changes were committed to the database.`);
      console.log(`   To execute and apply changes to DB, run: node apps/backend/src/db/correct_item_status_targeted.js --commit`);
    }

    console.log("================================================================================\n");

  } catch (err) {
    await dbClient.query("ROLLBACK;");
    console.error("❌ ERROR during targeted correction execution (Transaction rolled back):", err);
    process.exitCode = 1;
  } finally {
    dbClient.release();
    await db.pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith("correct_item_status_targeted.js")) {
  correctItemStatusesTargeted();
}
