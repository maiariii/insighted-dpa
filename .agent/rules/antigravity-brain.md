# Design Contract Rules

## Scope

This file is a **global standard** — reuse it as-is in every project.
Everything in `docs/` is **project-specific** — never copy `docs/`
content into another project; generate it fresh each time.

`docs/` is split into three subfolders:
- `docs/product/` — `PRODUCT_OVERVIEW.md`, `ARCHITECTURE.md` (**frozen**)
- `docs/ui-components/` — one file per reusable component documenting
  its props, behavior, interaction patterns, and usage (**frozen**) —
  check this before building any new UI to see if a matching component
  already exists, rather than building a duplicate from scratch. Mirrors
  what actually exists in `shared/` (or the ui-kit package, per
  `docs/product/ARCHITECTURE.md`) — if a component is added there,
  document it here too. This is the single source for UI/UX behavior —
  there is no separate general UX spec folder; component-level detail
  covers it.
- `docs/living/` — `BUSINESS_LOGIC.md`, `DATA_FLOW_MAP.md`,
  `DECISIONS.md`, `CHANGELOG.md`, `PROGRESS.md`, `DEVIATIONS.md`
  (**AI-maintained**)

Design tokens (colors, spacing, typography, radius, shadows) live in
actual code — a `tokens.ts`/`tokens.css` file referenced from
`ARCHITECTURE.md` — not in a markdown doc. Exact values belong in code,
where they can't drift from being re-typed slightly differently each
time; components should pull from that file rather than hardcoding
values.

If `docs/` doesn't exist yet in a project, check whether the app itself
already has working code (`apps/frontend/`, `apps/backend/`, or
equivalent, with actual components already built) versus being empty.

- **Empty project:** create the three subfolders and generate
  placeholder files with `[fill in: ...]` markers — don't invent this
  app's actual purpose, colors, or structure. Ask the user directly for
  `PRODUCT_OVERVIEW.md` essentials rather than leaving it blank.
- **Already-built app with no `docs/` yet:** don't hand back empty
  templates for an app that already exists — that's backwards. Instead,
  read the actual code section by section and generate a
  `docs/ui-components/` file per existing component (props, behavior,
  usage) and `docs/product/ARCHITECTURE.md` from what's really there.
  Still ask the user directly for `PRODUCT_OVERVIEW.md` essentials
  (purpose, users, objectives aren't extractable from code alone). Tell
  the user these were derived from existing code, not designed fresh,
  so they know to review them before treating the specs as final.

## Frozen vs. AI-maintained

**Frozen** (`docs/product/`, `docs/ui-components/`): these are the
user's standards. Never edit, soften, or "sync" them based on what the
code currently does — only edit when the user explicitly instructs a
change to that specific file. If code and a frozen doc disagree, log it
in `docs/living/DEVIATIONS.md`, tell the user, and wait for their
decision.

**AI-maintained** (`docs/living/`): update these proactively as normal
work happens — no need to ask first.

If a new request conflicts with something already documented (an
objective, a past decision, existing business logic), stop and ask
rather than silently picking an interpretation.

## UI/UX and product contract

`docs/product/PRODUCT_OVERVIEW.md` (purpose, users, objectives) and
`docs/product/ARCHITECTURE.md` (tech stack, component library, folder
structure, design tokens) should be read before feature work.

**Always check `docs/ui-components/` before building any new UI
element** — a card, table, graph, chart, header, sidebar, or anything
else. This applies in two ways:

1. **Exact match exists:** if a component that fits the need already
   exists (there or in `shared/`), reuse or extend it instead of
   building a new one from scratch. Match its documented behavior
   exactly — props, states, interactions are binding, not suggestions.
2. **No exact match, but the element type is new:** still read through
   `docs/ui-components/` first and pull consistency clues from what
   already exists — animation style and timing, transition behavior,
   hover/focus treatment, spacing conventions, how loading/empty/error
   states are handled elsewhere. A brand-new card or chart should still
   *feel* like it belongs next to the existing sidebar and tables, not
   like it was designed in isolation. Don't invent a new interaction
   style when an equivalent one already exists elsewhere in the app.

This is what makes components replicable and visually consistent across
the app, instead of the same button/table/modal/card being reinvented
slightly differently each time, or a new element type clashing with
everything already built.

**Spec-first for new UI/UX features.** If a requested feature isn't a
variant of an existing documented component, don't jump straight to
code. First draft the relevant behavior in conversation — states,
interactions, and any values that need to be exact — and get the user's
approval before writing anything to `docs/ui-components/` or
`docs/product/`, since those are frozen and only get edited on explicit
approval. Only implement code once confirmed and written. This applies
to genuinely new UI/UX surfaces; it does not apply to small changes
within an already-documented component, or to backend-only work.

**Stop and alert the user before doing feature work that depends on
purpose, audience, or scope if:**
- `docs/product/PRODUCT_OVERVIEW.md` doesn't exist, or
- it exists but is still a template — still has `[fill in: ...]`
  placeholders instead of actual content.

A template file is functionally the same as a missing file; don't treat
its presence as "handled" just because it exists on disk. UI/UX-only
tasks (matching a documented component's behavior) can proceed without
it, but flag the gap regardless.

## Folder architecture

Follow `docs/product/ARCHITECTURE.md` for the specifics of where code
lives in this project. The default structure, unless `ARCHITECTURE.md`
says otherwise:

```
apps/
  frontend/   # frontend-only code
  backend/    # backend-only code
shared/       # used by both — types, constants, validation, utilities
```

Frontend and backend code should not import from each other directly.
Anything needed by both sides goes in `shared/` instead of being
duplicated in both — this is the main reason to reach for `shared/`: if
you're about to retype or re-declare something that already exists on
the other side, it belongs there instead.

If a new kind of file doesn't clearly fit this structure, ask the user
rather than guessing.

## Database protection

- **Never truncate, drop, or bulk-delete real data** without explicit,
  specific confirmation from the user for that action. "Clean this up"
  is not sufficient confirmation on its own.
- **Seed/mock data must never persist in production** — seed scripts
  check the environment and refuse to run against production.
- **Destructive migrations get reviewed and confirmed before running**
  — summarize what will change, especially drops/type changes, before
  executing against real data.
- **No ad hoc direct writes to production** — go through reviewed,
  version-controlled migrations or application code.
- **Recommend a backup before risky operations.**
- **When scope is ambiguous, default to the safest (non-production)
  interpretation** and ask before anything irreversible.

## Git hygiene

- Commit to `main` by default.
- One feature or fix per commit — avoid bundling unrelated changes.
- Write commit messages that describe what changed and why.
- Recommend a commit/checkpoint before a significant AI-driven change,
  so there's a clean revert point if it goes wrong.

## Definition of done

Before calling a feature complete:
- Matches the relevant `docs/ui-components/` documentation
- `docs/living/BUSINESS_LOGIC.md` updated if new rules/permissions/calculations were introduced
- `docs/living/DATA_FLOW_MAP.md` updated if the feature reads or writes
  data — track which specific user action (button, form, screen)
  triggers each save and where it lands, not just "where data goes."
  This is what catches two buttons quietly writing to the same field
  differently.
- Any unmatched pattern logged in `docs/living/DEVIATIONS.md`
- Basic error states handled, no hardcoded values that should be config
- Reviewed for security issues and unhandled errors, not just spec match
- `docs/living/CHANGELOG.md` and `docs/living/PROGRESS.md` updated
- Only what was explicitly asked for was built — no unrequested
  refactors or "improvements"; suggest those separately instead

Keep `docs/living/` current as this happens, without waiting to be
asked — log non-obvious technical choices in `DECISIONS.md` as they're
made, not just at task completion. On first working in a project,
generate a base `BUSINESS_LOGIC.md` from `PRODUCT_OVERVIEW.md` and
`docs/ui-components/` — don't overwrite it if it already exists.

## Communication style

Explain in plain language by default. Use technical terms only when
necessary, and briefly explain them the first time. Favor everyday
analogies over jargon.

## Token efficiency

Don't re-read unchanged files, don't paste full file contents back
unnecessarily, work in stages for large features, keep living docs
concise. Never skip a quality or safety check to save tokens — a bug
shipped to save tokens costs more to fix later.

## Cross-tool consistency

This project may also use `.agent/rules/antigravity-brain.md` (Google
Antigravity), which mirrors this file, and `.agent/workflows/sync-specs.md`
— an on-demand audit that checks `docs/ui-components/` against the
current code and proposes updates (never applies them without approval
— see "Frozen vs. AI-maintained" above). If the user changes a rule in
one brain file, apply the same change to the other in the same session.
