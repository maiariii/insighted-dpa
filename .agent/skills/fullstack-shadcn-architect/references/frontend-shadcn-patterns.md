# Frontend shadcn Patterns

## Objective
Implement feature UIs with consistent shadcn/ui primitives and clear separation between presentation, state, and API interaction.

## Setup Checklist (Vite + React)
1. Run commands from `apps/client`.
2. Ensure Tailwind and path alias are configured for `@/`.
3. Initialize shadcn/ui for the project:
   - `npx shadcn@latest init`
4. Add only needed components per feature:
   - `npx shadcn@latest add button card input form dialog table badge toast`

## Folder Pattern
Use this structure for each feature:

```text
src/
  components/
    ui/                     # shadcn-generated primitives only
  features/
    <feature>/
      components/           # feature-specific composed UI
      hooks/                # feature-specific state and orchestration
      schemas/              # client-side validation schemas
      mappers/              # api-to-view-model mapping
      index.js              # feature public exports
  services/
    <feature>.service.js    # HTTP calls only
  pages/
    <Feature>Page.jsx       # route entry, minimal logic
```

## Guardrails
- Keep `components/ui` free of feature business logic.
- Keep API calls out of page and presentational components.
- Keep data transformations in hooks or `mappers/`.
- Keep CSS tokens centralized; avoid ad-hoc inline styles for recurring patterns.
- Keep component props explicit; avoid spreading large untyped objects.

## Anti-Patterns
- Fetching directly inside reusable UI primitives.
- Reusing one giant hook for unrelated features.
- Copy-pasting shadcn components with local one-off edits instead of composition.
- Keeping server response shape directly in UI without mapping.
