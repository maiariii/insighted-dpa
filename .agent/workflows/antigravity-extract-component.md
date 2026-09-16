# Extract Component Workflow

Triggered via `/extract-component [component name or file path]` in the
Antigravity chat.

## Purpose

Turn an existing, working component into a reusable one, staged in the
`docs/ui-components/` directory inside a dedicated folder per component (e.g.
`docs/ui-components/<ComponentName>/`), without carrying over app-specific
assumptions.

**`docs/ui-components/` is not this project's active application component folder — do
not place output in the project's usual location (e.g.
`apps/client/src/components/`), even if `ARCHITECTURE.md` says that's
where components normally go.** That folder is for components used
*within* this app. `docs/ui-components/` is a separate staging area
specifically for components meant to be copied into a **different
project entirely** — the two serve different purposes and must not be
merged.

## Steps

1. **Locate** the source component from the given name or path. If
   ambiguous, ask which file.
2. **Separate structure from data.** Remove hardcoded references to this
   app's data shape, API calls, or business logic. The extracted
   component must accept data via props — it doesn't fetch or assume
   anything about where data comes from.
3. **Preserve behavior, drop content.** Keep: sorting, filtering,
   pagination, drilldown, loading/empty states, and any other
   interaction pattern. Drop: specific column names, specific filter
   options, anything tied to this app's domain.
4. **Make it configurable via props** (e.g. `columns`, `data`,
   `onDrilldown`, `sortable`, `pageSize`) so the same component can serve
   a different dataset in a different project.
5. **Use design tokens**, not hardcoded hex/px/timing values — pull from
   the shared tokens file so the component inherits the visual system
   automatically instead of re-declaring it.
6. **No app-specific imports.** The extracted component may only import
   from `shared/` or the ui-kit package itself — never from
   `apps/frontend/` of the source app.
7. **Verify portability before writing output.** Check every import in
   the extracted component. If any import still points into this app's
   own folders (contexts, hooks, utils, other components) rather than
   `shared/`, the ui-kit, or a standard external package, that's a
   failed extraction — fix it before proceeding, don't ship a component
   that only looks portable.
8. **Output** the new component file(s) into a dedicated folder inside
   `docs/ui-components/` (e.g. `docs/ui-components/<ComponentName>/` containing
   `jsx`, `css`, `js`, `README.md`, and any other produced files) — never into
   this project's normal component directory. Include a short usage example
   showing how a different project would consume it with different
   data.
9. **Report what changed.** Explicitly list what was app-specific and
   got generalized or removed, so the user can confirm nothing that
   should have been preserved (e.g. a UX rule) got stripped by mistake.

## Guardrails

- This is a per-component extraction, not a bulk "extract my whole UI"
  operation — one component per run unless the user explicitly asks for
  more.
- If a UX rule tied to this component's behavior lives in `docs/ux/`
  (e.g. drilldown scoping), preserve that behavior exactly — don't
  simplify it away during generalization.
- Do not publish or version-bump the ui-kit package as part of this
  workflow — extraction only produces the component in
  `docs/ui-components/<ComponentName>/`; folding it into a real package and publishing is a
  separate, explicit step the user triggers themselves.

