# Changelog

Seeded from `git log` at doc-generation time (2026-09-06). Keep entries
concise going forward — enough to restore context quickly, not a full
narrative.

- **add export csv** — CSV export capability added.
- **retirement option added** — new reason-for-vacancy / status option
  for retirement-driven vacancies.
- **COMPONENT LIBRARY FIX** — fixes to `@insighted/ui`.
- **login token** — JWT login flow work.
- **header** — header component changes.
- **go / sdo fix / final / deployment / new changes** — deployment and
  fix iterations (messages too generic to reconstruct specifics from
  git log alone).
- **feat: Add normalized 2personnel_audits dataset with id, dpa_month,
  and dpa_year** — dataset normalization for the CSV import.
- **Fix dark mode table styling and schema CSV import updates**
- **Initial commit: Relational auth schema migration, seed data, and
  JWT authentication service**

## 2026-09-15 — Item-Level Position Breakdown & Filling-Up Rate (HQ Alignment)
- Updated `PositionBreakdownCards.jsx` to break down items by **Position Title** (e.g., *Teacher I*, *Administrative Officer II*, *Teacher II*, *Teacher III*, *School Principal I*).
- Chunked position titles into pages of 5 items per slide with proportional horizontal bars, formatted counts, and dot pill indicators matching HQ.
- Added smooth wheel/trackpad scroll listener to seamlessly cycle through position title pages while reusing established HQ card styling.
- Strictly partitioned `position_status` ('FILLED' vs. 'UNFILLED') without assuming NULL or unknown values are UNFILLED.
- Changed dashboard completion percentage metric to official **Filling-Up Rate** $(\text{Total Filled} / (\text{Total Filled} + \text{Total Unfilled})) \times 100\%$, aligning denominator population exactly to the combined count of both cards.
- Preserved all existing backend APIs, database schemas, chart visualizations, and modal drill-down workflows.

## 2026-09-15 — Personnel Audit Section Consolidation & UI Simplification
- Removed redundant secondary "Finalized / Audited Personnel Records" section from `AuditDashboard.jsx`.
- Integrated "Export CSV" directly into the Personnel Audit Main Panel header actions bar alongside dynamic record count badge.
- Simplified edit modals (`RemarksModal` and `RowEditModal`) to point directly to main staged edits state, retiring decoupled finalized staging state and obsolete confirmation modals.
- All records (audited and unaudited) continue to be accessible, filtered, sorted, edited, and exported from the single unified Main Panel table.

## 2026-09-15 — Personnel Audit Main Panel All-Rows Display
- Updated `filteredActiveRecords` in `AuditDashboard.jsx` to show all personnel audit records regardless of whether `is_audited` is TRUE or FALSE.
- Added explicit green `Audited` status badge in the Submission Status column for completed records.
- Preserved category filtering (Teaching, Non-Teaching, Teaching-Related tabs), pagination, column filtering, and the secondary Finalized table.

## 2026-09-15 — Filled & Unfilled Position Breakdown Cards (HQ-Style Carousel)
- Implemented `PositionBreakdownCards` component with dynamic Teaching, Non-Teaching, and Teaching-Related graph breakdowns.
- Added scrollable multi-slide carousel (`‹ • • • • ›`) supporting Category, Status, Salary Grade, and Aging dimensions.
- Integrated emerald/rose accent cards and live accomplishment summary on `HomeDashboard.jsx`.

## 2026-09-15 — System Preservation & Non-Regression Policy Established
- Created single authoritative `SYSTEM_PRESERVATION_POLICY.md` documenting verified repository inventory, 18 core non-regression principles, and protected domain invariants.
- Added root integration files `AGENTS.md` and `GEMINI.md` referencing the authoritative policy without duplicating or conflicting.
- Added synchronized rule integration layers `.agent/rules/system-preservation-policy.md`.
- Created active Antigravity skill `.agent/skills/dpa-system-guardian/SKILL.md` with pre-modification impact checklist and invariant reference tables.

## 2026-09-06 — Restructured docs folder & added self-protection rules
- Removed obsolete `docs/SCOPE.md`.
- Updated relative paths in `docs/ux/DESIGN_CONTRACT.md`.
- Created `.agent/workflows/sync-specs.md` global audit workflow file.
- Added "Self-protection: this file is frozen too" section to `CLAUDE.md` and `.agent/rules/antigravity-brain.md`.

## 2026-09-06 — Initial docs/ generation
Reverse-engineered the full `docs/` folder (this file included) from
the existing codebase, per the user's request to use this prototype as
the template for other apps. See `DEVIATIONS.md` for what was found
messy/inconsistent along the way.
