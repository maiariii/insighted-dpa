# Anti-Spaghetti Checklist

Pass all `BLOCKING` checks before finishing.

## Architecture Checks
- `BLOCKING` No file mixes route/controller/service/repository responsibilities.
- `BLOCKING` No direct `fetch`/axios calls inside reusable UI components.
- `BLOCKING` No backend business rule depends on Express `req` or `res`.
- `BLOCKING` No hidden cross-feature imports that bypass public module boundaries.
- `BLOCKING` No duplicated endpoint path logic across route files.

## Contract Checks
- `BLOCKING` Request and response shape documented before implementation.
- `BLOCKING` Validation exists for required request input.
- `BLOCKING` Error codes are explicit and consistent with API behavior.
- `BLOCKING` UI handles loading, empty, validation error, and server error states.

## Maintainability Checks
- `RECOMMENDED` Large files are split when they become hard to scan.
- `RECOMMENDED` Function names describe intent, not technical steps.
- `RECOMMENDED` Shared utilities have one clear domain purpose.
- `RECOMMENDED` New modules include usage notes in feature index exports.

## Verification Checks
- `BLOCKING` Lint or static checks pass for touched apps.
- `BLOCKING` Manual endpoint smoke test succeeds.
- `BLOCKING` UI flow works end-to-end for happy path and one failure path.
