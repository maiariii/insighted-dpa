# System Preservation & Non-Regression Rule

This rule integrates the repository's single authoritative preservation policy:
**[SYSTEM_PRESERVATION_POLICY.md](file:///e:/christop/insighted-dpa/SYSTEM_PRESERVATION_POLICY.md)**.

## Core Rule: Preserve Existing Behavior by Default

Every AI agent operating in this repository must:
1. **Preserve all existing functionality by default**. Modify existing functionality only when the user's current request explicitly requires that functionality to change.
2. **Never delete, remove, overwrite, disable, or simplify away working code** (components, functions, endpoints, route aliases, database constraints, modals, or business calculations).
3. **Protect Core Invariants**:
   - Authentication & Scoped Authorization (`verifyToken`, DepEd email checks, regional/divisional isolation).
   - Database Invariants (`chk_incumbent_filled_state`, uppercase triggers, safe migrations).
   - Business Calculations (`is_audited` logic, tentative date exemption lists, future-date interventions).
   - UI Workflows (sticky columns, staged edits, confirmation modals, font scaling).
   - Multi-Mount Route Aliases (`/insighted-dpa/api/...` and `/api/...`).
4. **Follow the Standard Execution Cycle**:
   $$\text{Understand} \longrightarrow \text{Baseline} \longrightarrow \text{Plan} \longrightarrow \text{Modify} \longrightarrow \text{Verify} \longrightarrow \text{Report}$$

See [SYSTEM_PRESERVATION_POLICY.md](file:///e:/christop/insighted-dpa/SYSTEM_PRESERVATION_POLICY.md) for full details.
