import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import db from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

export async function correctItemStatuses() {
  const isCommit = process.argv.includes("--commit") || process.argv.includes("--apply");
  const modeName = isCommit ? "EXECUTE / COMMIT MODE" : "DRY-RUN / PREVIEW MODE";

  console.log("================================================================================");
  console.log(`🚀 PERSONNEL AUDITS ITEM_STATUS CORRECTION (${modeName})`);
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

  const csvMap = new Map();
  let duplicateCsvCount = 0;

  for (let i = 1; i < rawLines.length; i++) {
    const row = parseCsvLine(rawLines[i]);
    const itemNum = row[itemNumIdx];
    const itemStatus = row[itemStatusIdx];

    if (itemNum) {
      if (csvMap.has(itemNum)) {
        duplicateCsvCount++;
      }
      csvMap.set(itemNum, itemStatus);
    }
  }

  console.log(`  ✅ Loaded ${csvMap.size} unique item_number records from CSV (Duplicates in CSV: ${duplicateCsvCount}).\n`);

  console.log("2. Fetching existing records from personnel_audits database table...");
  const dbClient = await db.pool.connect();

  try {
    const dbRes = await dbClient.query("SELECT id, item_number, item_status, position_title, is_audited, position_status FROM personnel_audits;");
    const dbRows = dbRes.rows;
    console.log(`  > Total DB records fetched: ${dbRows.length}`);

    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatchedDbRows = [];
    const rowsNeedingCorrection = [];
    const auditedStatusRowsToFix = [];
    const statusCountsToSet = {};

    for (const dbRow of dbRows) {
      const itemNum = dbRow.item_number;
      const currentDbStatus = dbRow.item_status;
      const csvStatus = csvMap.get(itemNum);

      if (csvStatus !== undefined) {
        matchedCount++;

        if (currentDbStatus !== csvStatus) {
          const correctionItem = {
            id: dbRow.id,
            item_number: itemNum,
            currentDbStatus,
            newCsvStatus: csvStatus,
            position_title: dbRow.position_title,
            is_audited: dbRow.is_audited,
            position_status: dbRow.position_status
          };
          rowsNeedingCorrection.push(correctionItem);

          if (currentDbStatus === "Audited") {
            auditedStatusRowsToFix.push(correctionItem);
          }

          statusCountsToSet[csvStatus] = (statusCountsToSet[csvStatus] || 0) + 1;
        }
      } else {
        unmatchedCount++;
        unmatchedDbRows.push({
          id: dbRow.id,
          item_number: itemNum,
          item_status: currentDbStatus,
          position_title: dbRow.position_title
        });
      }
    }

    console.log("\n================================================================================");
    console.log("📊 MATCHING & CORRECTION SUMMARY");
    console.log("================================================================================");
    console.log(`  - Total CSV Rows Loaded:                   ${csvMap.size}`);
    console.log(`  - Total DB Records Checked:                ${dbRows.length}`);
    console.log(`  - Matched Records (in CSV & DB):          ${matchedCount}`);
    console.log(`  - Unmatched DB Records (in DB but NOT CSV): ${unmatchedCount}`);
    console.log(`  - DB Records Needing Status Correction:    ${rowsNeedingCorrection.length}`);
    console.log(`    └─ Records currently having status 'Audited': ${auditedStatusRowsToFix.length}`);

    if (unmatchedDbRows.length > 0) {
      console.log("\n⚠️ FLAGGED UNMATCHED DB RECORDS (NO CORRESPONDING CSV ROW):");
      unmatchedDbRows.forEach((r, idx) => {
        console.log(`   [${idx + 1}] DB ID: ${r.id} | Item Number: ${r.item_number} | Current Status: '${r.item_status}' | Title: ${r.position_title}`);
      });
    } else {
      console.log("\n  ✅ Zero unmatched DB records! All personnel_audits rows exist in CSV.");
    }

    if (rowsNeedingCorrection.length > 0) {
      console.log("\n📋 PROPOSED UPDATES BREAKDOWN:");
      console.log("   New Status Values to apply:", statusCountsToSet);

      console.log("\n   Detailed Mapping of Items to Update:");
      rowsNeedingCorrection.forEach((r, idx) => {
        console.log(`   [${idx + 1}] Item: ${r.item_number.padEnd(32)} | DB Status: '${r.currentDbStatus}' -> New CSV Status: '${r.newCsvStatus}' | Title: ${r.position_title}`);
      });
    } else {
      console.log("\n  ✨ All matched DB records already have their correct item_status! No corrections needed.");
    }

    console.log("\n================================================================================");
    console.log(`3. Running updates inside database transaction (${modeName})...`);

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
      console.log(`\n✅ TRANSACTION COMMITTED SUCCESSFULLY! ${updatedCount} rows updated in database.`);
    } else {
      await dbClient.query("ROLLBACK;");
      console.log(`\n🔍 PREVIEW MODE COMPLETE (ROLLBACK EXECUTED).`);
      console.log(`   ${updatedCount} proposed row updates were tested cleanly in transaction.`);
      console.log(`   No changes were committed to the database.`);
      console.log(`   To execute and apply changes to DB, run: node apps/backend/src/db/correct_item_status.js --commit`);
    }

    console.log("================================================================================\n");

  } catch (err) {
    await dbClient.query("ROLLBACK;");
    console.error("❌ ERROR during correction execution (Transaction rolled back):", err);
    process.exitCode = 1;
  } finally {
    dbClient.release();
    await db.pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith("correct_item_status.js")) {
  correctItemStatuses();
}
