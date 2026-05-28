# 0007 — Auth service steps 9–13 stabilization

## Context

The auth service needed a stabilization pass to finish the remaining backend foundation work without changing the existing NestJS + Prisma architecture.

## Decision

Keep the JWT payload minimal (`sub`, `email`, `role`) and rely on session persistence for refresh and logout flows.

Use explicit audit methods for the core auth events, keep sessions hashed and device-aware, and make the local Docker setup depend on environment variables and persistent volumes.

Add a lightweight Jest baseline with unit and e2e skeletons so the auth service has a stable test structure without introducing extra architectural layers.

## Alternatives considered

- Adding session IDs to JWT claims: rejected because the payload should stay minimal.
- Introducing extra auth abstractions or service splits: rejected to keep the current architecture stable.
- Deferring test and Docker cleanup: rejected because both are part of the requested completion pass.

## Consequences

- The auth service keeps a small, secure JWT surface.
- Sessions remain the source of truth for refresh/logout handling.
- Audit logs are explicit and compliance-friendly.
- Local development and CI have a clearer test and container baseline.
