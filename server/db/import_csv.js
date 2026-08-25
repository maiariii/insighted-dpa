const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("./index");

// Region ID resolution helper
function getRegionId(name) {
  if (!name) return "UNKNOWN";
  const match = name.match(/\(([^)]+)\)$/);
  if (match) return match[1].trim();
  if (name.includes(" - ")) {
    return name.split(" - ")[0].replace(/\s+/g, "_").toUpperCase();
  }
  return name.substring(0, 10).toUpperCase();
}

function safeInt(val, fallback = 0) {
  if (val === null || val === undefined || val === "") return fallback;
  const num = parseInt(val, 10);
  return isNaN(num) ? fallback : num;
}

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

async function importCsvData() {
  console.log("=================================================");
  console.log("🚀 IMPORTING PERSONNEL AUDITS CSV DATA");
  console.log("=================================================\n");

  const csvPath = path.join(__dirname, "../../2personnel_audits_202608251903.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("❌ Error: CSV file not found at:", csvPath);
    process.exit(1);
  }

  console.log("1. Running database schema migration...");
  await db.runMigration();

  console.log("\n2. Reading and parsing CSV file:", csvPath);
  const fileContent = fs.readFileSync(csvPath, "utf8");
  const rawLines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (rawLines.length < 2) {
    console.error("❌ CSV file is empty or missing data rows.");
    process.exit(1);
  }

  // Canonical headers structure
  const canonicalHeaders = [
    "id", "dpa_month", "dpa_year", "region_id", "division_id",
    "position_category", "item_status", "item_number", "position_title",
    "sg", "year_created", "years_unfilled", "vacancy_aging_status",
    "position_status", "name_of_incumbent", "first_day_of_service",
    "date_of_vacancy", "reason_for_vacancy", "status_of_vacancy",
    "other_remarks", "tentative_date_to_fill_up", "is_audited",
    "created_at", "updated_at"
  ];

  const rawHeaders = parseCsvLine(rawLines[0]);
  console.log(`  > Raw CSV Header count: ${rawHeaders.length}`);

  const dpaMonth = 8;
  const dpaYear = 2026;

  // Build mapping from field name -> index in raw line
  // If rawHeaders has duplicates like dpa_month, find unique position for region_id, etc.
  let regionIdx = rawHeaders.indexOf("region_id");
  let divisionIdx = rawHeaders.indexOf("division_id");
  let categoryIdx = rawHeaders.indexOf("position_category");
  let itemStatusIdx = rawHeaders.indexOf("item_status");
  let itemNumIdx = rawHeaders.indexOf("item_number");
  let posTitleIdx = rawHeaders.indexOf("position_title");
  let sgIdx = rawHeaders.indexOf("sg");
  let yrCreatedIdx = rawHeaders.indexOf("year_created");
  let yrsUnfilledIdx = rawHeaders.indexOf("years_unfilled");
  let agingIdx = rawHeaders.indexOf("vacancy_aging_status");
  let posStatusIdx = rawHeaders.indexOf("position_status");
  let incumbentIdx = rawHeaders.indexOf("name_of_incumbent");
  let firstDayIdx = rawHeaders.indexOf("first_day_of_service");
  let dateVacIdx = rawHeaders.indexOf("date_of_vacancy");
  let reasonVacIdx = rawHeaders.indexOf("reason_for_vacancy");
  let statusVacIdx = rawHeaders.indexOf("status_of_vacancy");
  let remarksIdx = rawHeaders.indexOf("other_remarks");
  let tentativeIdx = rawHeaders.indexOf("tentative_date_to_fill_up");
  let isAuditedIdx = rawHeaders.indexOf("is_audited");

  // Fallback indices if header names were original format
  if (regionIdx === -1) regionIdx = 1;
  if (divisionIdx === -1) divisionIdx = 2;
  if (categoryIdx === -1) categoryIdx = 3;
  if (itemStatusIdx === -1) itemStatusIdx = 4;
  if (itemNumIdx === -1) itemNumIdx = 5;
  if (posTitleIdx === -1) posTitleIdx = 6;
  if (sgIdx === -1) sgIdx = 7;
  if (yrCreatedIdx === -1) yrCreatedIdx = 8;
  if (yrsUnfilledIdx === -1) yrsUnfilledIdx = 9;
  if (agingIdx === -1) agingIdx = 10;
  if (posStatusIdx === -1) posStatusIdx = 11;
  if (incumbentIdx === -1) incumbentIdx = 12;
  if (firstDayIdx === -1) firstDayIdx = 13;
  if (dateVacIdx === -1) dateVacIdx = 14;
  if (reasonVacIdx === -1) reasonVacIdx = 15;
  if (statusVacIdx === -1) statusVacIdx = 16;
  if (remarksIdx === -1) remarksIdx = 17;
  if (tentativeIdx === -1) tentativeIdx = 18;
  if (isAuditedIdx === -1) isAuditedIdx = 19;

  const uniqueRegions = new Map();
  const uniqueDivisions = new Map();

  const processedRows = [];
  const cleanCsvLines = [];
  cleanCsvLines.push(canonicalHeaders.join(","));

  console.log(`\n3. Processing ${rawLines.length - 1} rows & normalizing structure...`);

  for (let i = 1; i < rawLines.length; i++) {
    const row = parseCsvLine(rawLines[i]);
    if (row.length < 5) continue;

    let rowId = rawHeaders.includes("id") && row[rawHeaders.indexOf("id")] ? row[rawHeaders.indexOf("id")] : "";
    if (!rowId || rowId.trim() === "") {
      rowId = crypto.randomUUID();
    }

    const regionName = row[regionIdx] || "";
    const officeName = row[divisionIdx] || "";
    const regionId = getRegionId(regionName);

    if (regionName && officeName) {
      uniqueRegions.set(regionName, regionId);
      uniqueDivisions.set(`${regionId}|${officeName}`, officeName);
    }

    const category = row[categoryIdx] || "Non-Teaching";
    const itemStatus = row[itemStatusIdx] || "Regular";
    const itemNum = row[itemNumIdx] || "";
    const posTitle = row[posTitleIdx] || "Unspecified";
    const sgVal = safeInt(row[sgIdx], 0);
    const yrCreatedVal = safeInt(row[yrCreatedIdx], 2026);
    const yrsUnfilledVal = safeInt(row[yrsUnfilledIdx], 0);
    const agingVal = row[agingIdx] || null;
    const posStatusVal = row[posStatusIdx] && row[posStatusIdx].trim() !== "" ? row[posStatusIdx].trim() : "UNFILLED";
    const incumbentVal = row[incumbentIdx] && row[incumbentIdx].trim() !== "" ? row[incumbentIdx].trim() : null;
    const firstDayVal = row[firstDayIdx] && row[firstDayIdx].trim() !== "" ? row[firstDayIdx].trim() : null;
    const dateVacVal = row[dateVacIdx] && row[dateVacIdx].trim() !== "" ? row[dateVacIdx].trim() : null;
    const reasonVacVal = row[reasonVacIdx] && row[reasonVacIdx].trim() !== "" ? row[reasonVacIdx].trim() : null;
    const statusVacVal = row[statusVacIdx] && row[statusVacIdx].trim() !== "" ? row[statusVacIdx].trim() : null;
    const remarksVal = row[remarksIdx] && row[remarksIdx].trim() !== "" ? row[remarksIdx].trim() : null;
    const tentativeVal = row[tentativeIdx] && row[tentativeIdx].trim() !== "" ? row[tentativeIdx].trim() : null;
    const isAuditedVal = row[isAuditedIdx] === "true" || row[isAuditedIdx] === "TRUE" || row[isAuditedIdx] === "1";

    // Standardized row for clean CSV file
    const cleanRowParts = [
      rowId, dpaMonth, dpaYear, regionName, officeName,
      category, itemStatus, itemNum, posTitle,
      sgVal, yrCreatedVal, yrsUnfilledVal, agingVal || "",
      posStatusVal, incumbentVal || "", firstDayVal || "",
      dateVacVal || "", reasonVacVal || "", statusVacVal || "",
      remarksVal || "", tentativeVal || "", isAuditedVal,
      "", ""
    ];

    cleanCsvLines.push(cleanRowParts.map(val => {
      const str = String(val ?? "");
      return str.includes(",") ? `"${str}"` : str;
    }).join(","));

    processedRows.push({
      id: rowId,
      dpa_month: dpaMonth,
      dpa_year: dpaYear,
      region_id: regionId,
      office_name: officeName,
      position_category: category,
      item_status: itemStatus,
      item_number: itemNum,
      position_title: posTitle,
      sg: sgVal,
      year_created: yrCreatedVal,
      years_unfilled: yrsUnfilledVal,
      vacancy_aging_status: agingVal,
      position_status: posStatusVal,
      name_of_incumbent: incumbentVal,
      first_day_of_service: firstDayVal,
      date_of_vacancy: dateVacVal,
      reason_for_vacancy: reasonVacVal,
      status_of_vacancy: statusVacVal,
      other_remarks: remarksVal,
      tentative_date_to_fill_up: tentativeVal,
      is_audited: isAuditedVal
    });
  }

  // 4. Overwrite CSV file with canonical headers & data
  console.log("\n4. Overwriting CSV file with canonical columns (id, dpa_month, dpa_year, region_id, ...)...");
  fs.writeFileSync(csvPath, cleanCsvLines.join("\n"), "utf8");
  console.log(`  ✅ CSV file successfully written (${cleanCsvLines.length - 1} rows).`);

  // 5. Upsert Regions
  console.log(`\n5. Upserting ${uniqueRegions.size} unique regions into database...`);
  for (const [regionName, regionId] of uniqueRegions.entries()) {
    await db.query(
      `INSERT INTO regions (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [regionId, regionName]
    );
  }

  // 6. Upsert Division Offices & Build Lookup Map
  console.log(`\n6. Upserting ${uniqueDivisions.size} unique division offices...`);
  for (const [key, officeName] of uniqueDivisions.entries()) {
    const [regionId] = key.split("|");
    await db.query(
      `INSERT INTO division_offices (region_id, office_name) VALUES ($1, $2) ON CONFLICT (region_id, office_name) DO UPDATE SET office_name = EXCLUDED.office_name`,
      [regionId, officeName]
    );
  }

  const divisionMap = new Map();
  const divRes = await db.query(`SELECT id, region_id, office_name FROM division_offices`);
  divRes.rows.forEach(r => {
    divisionMap.set(`${r.region_id}|${r.office_name}`, r.id);
  });

  // 7. Batch Insert Personnel Audits into PostgreSQL
  console.log(`\n7. Batch inserting ${processedRows.length} personnel audit records into PostgreSQL...`);
  const batchSize = 1000;
  let insertedCount = 0;

  for (let i = 0; i < processedRows.length; i += batchSize) {
    const batch = processedRows.slice(i, i + batchSize);
    
    const valueTuples = [];
    const queryParams = [];
    let paramIndex = 1;

    for (const r of batch) {
      const divisionId = divisionMap.get(`${r.region_id}|${r.office_name}`);
      if (!divisionId) continue;

      valueTuples.push(`(
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}
      )`);

      queryParams.push(
        r.id,
        r.dpa_month,
        r.dpa_year,
        r.region_id,
        divisionId,
        r.position_category,
        r.item_status,
        r.item_number,
        r.position_title,
        r.sg,
        r.year_created,
        r.years_unfilled,
        r.vacancy_aging_status,
        r.position_status,
        r.name_of_incumbent,
        r.first_day_of_service,
        r.date_of_vacancy,
        r.reason_for_vacancy,
        r.status_of_vacancy,
        r.other_remarks,
        r.tentative_date_to_fill_up,
        r.is_audited
      );
    }

    if (valueTuples.length === 0) continue;

    const batchSql = `
      INSERT INTO personnel_audits (
        id, dpa_month, dpa_year, region_id, division_id, position_category, item_status,
        item_number, position_title, sg, year_created, years_unfilled, vacancy_aging_status,
        position_status, name_of_incumbent, first_day_of_service, date_of_vacancy,
        reason_for_vacancy, status_of_vacancy, other_remarks, tentative_date_to_fill_up, is_audited
      ) VALUES ${valueTuples.join(",")}
      ON CONFLICT (item_number) DO UPDATE SET
        dpa_month = EXCLUDED.dpa_month,
        dpa_year = EXCLUDED.dpa_year,
        position_title = EXCLUDED.position_title,
        sg = EXCLUDED.sg,
        year_created = EXCLUDED.year_created,
        years_unfilled = EXCLUDED.years_unfilled,
        vacancy_aging_status = EXCLUDED.vacancy_aging_status,
        updated_at = CURRENT_TIMESTAMP;
    `;

    await db.query(batchSql, queryParams);
    insertedCount += batch.length;

    if (insertedCount % 10000 === 0 || insertedCount === processedRows.length) {
      console.log(`  > Progress: ${insertedCount} / ${processedRows.length} records inserted/updated.`);
    }
  }

  console.log("\n=================================================");
  console.log(`🎉 IMPORT COMPLETE: ${insertedCount} RECORDS LOADED INTO DATABASE`);
  console.log("=================================================");

  db.pool.end();
}

importCsvData().catch(err => {
  console.error("❌ CSV IMPORT ERROR:", err);
  db.pool.end();
  process.exit(1);
});
