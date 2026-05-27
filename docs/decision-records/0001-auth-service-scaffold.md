# 0001 — Auth service scaffold

## Context

The repository needs a production-ready auth-service scaffold without introducing duplicate folder structures or unnecessary platform work.

## Decision

Keep the monorepo lean and modular with NestJS, Prisma, PostgreSQL, Redis, JWT auth, Argon2, and a security-first default configuration.

## Consequences

- Auth-specific code remains in `apps/auth-service`.
- Shared concerns can move into `packages` later if they are reused.
- Kubernetes, event buses, and broader infrastructure are intentionally deferred.
