# Backend Layered Patterns

## Objective
Keep backend code modular, testable, and predictable by enforcing strict flow and responsibilities.

## Module Pattern
Create one module per feature:

```text
apps/server/src/
  modules/
    <feature>/
      <feature>.routes.js
      <feature>.controller.js
      <feature>.service.js
      <feature>.repository.js
      <feature>.schema.js
      <feature>.mapper.js        # optional
```

## Layer Responsibilities
- `routes`: declare endpoints, bind middleware, validate request shape.
- `controller`: parse request data, call service, map result to HTTP response.
- `service`: enforce business rules, coordinate transactions, throw domain errors.
- `repository`: database/external API access only, no business branching.
- `schema`: input validation and normalization.
- `mapper`: map persistence models to API response contracts.

## Request Flow
1. Route validates input.
2. Controller calls service with sanitized input.
3. Service executes domain logic and calls repository.
4. Repository returns raw data.
5. Service maps to domain result and returns.
6. Controller maps result to HTTP response.

## Guardrails
- Keep service code independent from Express objects (`req`, `res`).
- Keep repository methods narrow and explicit per use case.
- Keep errors typed and centralized (`ValidationError`, `NotFoundError`, `ConflictError`).
- Keep cross-feature calls at service layer only.
- Keep shared utilities under `src/utils` only when truly cross-cutting.

## Anti-Patterns
- Calling repository directly from routes.
- Putting HTTP status logic inside service layer.
- Embedding SQL/query literals across multiple services.
- Creating generic `helpers.js` files that mix unrelated concerns.
