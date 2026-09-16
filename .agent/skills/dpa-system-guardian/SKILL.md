---
name: dpa-system-guardian
description: Full-stack domain guardian and non-regression workflow for InsightED DPA. Use whenever modifying or extending features, API endpoints, UI screens, database structures, or business rules in the insighted-dpa repository to ensure existing functionality is preserved.
---

# DPA System Guardian

This skill provides an active operational cheatsheet and step-by-step verification runbook to ensure that all development in the **InsightED DPA** repository strictly adheres to the [SYSTEM_PRESERVATION_POLICY.md](../../SYSTEM_PRESERVATION_POLICY.md).

---

## 1. The Core Preservation Mandate

> **Preserve all existing functionality by default. Modify existing functionality only when the user's current request explicitly requires that specific functionality to change.**

When implementing any task:
- Never delete, overwrite, stub, or bypass existing functions, endpoints, UI components, or constraints.
- Make the smallest necessary diff that satisfies the user prompt.
- Retain backward compatibility across all route aliases and component props.

---

## 2. Pre-Modification Impact Checklist

Before editing any file, answer these 5 questions:

1. **Target Identification**: Exactly which file(s) and function(s) need to be modified for the user's explicit request?
2. **Dependency Analysis**: What other components, hooks, services, or API endpoints depend on this code?
3. **Invariant Check**: Does this change touch any core invariants?
   - `chk_incumbent_filled_state` (FILLED vs UNFILLED rules)
   - Incumbent uppercase trigger & normalization
   - `is_audited` calculation and tentative date exemption lists
   - Regional & divisional isolation checks (`verifyToken` + user scope)
   - Staged edits lifecycle in `AppContext`
   - Multi-mount route aliases (`/`, `/api/...`, `/insighted-dpa/api/...`)
4. **Preservation Scope**: What existing features surrounding this code must remain 100% untouched?
5. **Rollback Plan**: Can this change be cleanly isolated or reverted without collateral damage?

---

## 3. Implementation Workflow

Follow the 6-step cycle:

### Step 1: Understand
Read the active source code for the target feature. Do not assume behavior from memory. Verify the current implementation in `apps/frontend/src/` or `apps/backend/src/`.

### Step 2: Baseline
Identify the existing input/output contracts, UI states (idle, loading, error, success), and database queries.

### Step 3: Plan
Formulate a minimal, additive change plan. If significant, provide a brief summary of planned edits.

### Step 4: Modify
- Apply the smallest practical diff.
- Reuse existing components from `packages/component-library` (`@insighted/ui`) or `apps/frontend/src/components/`.
- Reuse existing schemas in `packages/shared/src/schemas/`.
- Keep validation at route boundaries and handle edge cases gracefully.

### Step 5: Verify
- Check for unintended removals or breaking prop changes.
- Verify API response envelopes match expectations.
- Run build/syntax checks if applicable.

### Step 6: Report
Conclude the turn with the standard Change Report:
- Files Inspected
- Files Modified
- Files Added
- Existing Functionality Preserved
- Existing Functionality Changed
- New Functionality
- Verification Performed
- Residual Risks / Testing Gaps

---

## 4. Protected Domain Invariants Reference

| Area | Invariant Rule | Source File |
| :--- | :--- | :--- |
| **Auth** | DepEd email domain requirement (`@deped.gov.ph` / `.deped.gov.ph`) | [packages/shared/src/schemas/auth.js](../../packages/shared/src/schemas/auth.js) |
| **Auth** | Dual authentication (bcrypt password OR 6-digit passcode) | [apps/backend/src/routes/auth.js](../../apps/backend/src/routes/auth.js) |
| **Auth** | Server-side passcode check on password change | [apps/backend/src/routes/auth.js](../../apps/backend/src/routes/auth.js) |
| **Scope** | Regional and Divisional data isolation | [apps/backend/src/routes/dpa.js](../../apps/backend/src/routes/dpa.js) |
| **DB** | `chk_incumbent_filled_state`: FILLED requires incumbent + 1st day; UNFILLED requires neither | [apps/backend/src/db/migrations/001_create_relational_auth_schema.sql](../../apps/backend/src/db/migrations/001_create_relational_auth_schema.sql) |
| **DB** | Uppercase incumbent name trigger (`trg_uppercase_incumbent_name`) | [apps/backend/src/db/migrations/001_create_relational_auth_schema.sql](../../apps/backend/src/db/migrations/001_create_relational_auth_schema.sql) |
| **Audit** | `is_audited` logic with `NA_TENTATIVE_DATE_STATUSES` & `OPTIONAL_TENTATIVE_DATE_STATUSES` | [apps/frontend/src/utils/recordValidation.js](../../apps/frontend/src/utils/recordValidation.js), [apps/backend/src/routes/dpa.js](../../apps/backend/src/routes/dpa.js) |
| **Interventions** | Target date must be in the future (`> today`); 10s idempotency guard | [packages/shared/src/schemas/dpa.js](../../packages/shared/src/schemas/dpa.js), [apps/backend/src/routes/dpa.js](../../apps/backend/src/routes/dpa.js) |
| **UI** | Sticky frozen table columns (`ITEM NUMBER`, `POSITION TITLE`) | [apps/frontend/src/pages/AuditDashboard.jsx](../../apps/frontend/src/pages/AuditDashboard.jsx) |
| **UI** | Staged edits decoupled persistence | [apps/frontend/src/context/AppContext.jsx](../../apps/frontend/src/context/AppContext.jsx), [apps/frontend/src/pages/AuditDashboard.jsx](../../apps/frontend/src/pages/AuditDashboard.jsx) |
| **UI** | Font-scaling slider persistence in localStorage (`dpa_guide_font_scale`) | [apps/frontend/src/pages/UserGuide.jsx](../../apps/frontend/src/pages/UserGuide.jsx) |
| **Routing** | Multi-deployment path aliases (`/`, `/api/...`, `/insighted-dpa/api/...`) | [apps/backend/src/index.js](../../apps/backend/src/index.js), [apps/frontend/src/utils/config.js](../../apps/frontend/src/utils/config.js) |

---
*For the complete authoritative policy, see [SYSTEM_PRESERVATION_POLICY.md](../../SYSTEM_PRESERVATION_POLICY.md).*
