# 0004 — Auth service Prisma initialization

## Context

The auth service needs a deterministic Prisma setup for local development, including a PostgreSQL datasource, a stable schema, and a generated client.

## Decision

Adopt Prisma as the auth service ORM layer with a local `.env`-backed `DATABASE_URL`, a PostgreSQL schema for users, sessions, and audit logs, and a `PrismaService` wrapped in a modular `PrismaModule`.

The local Docker PostgreSQL configuration is aligned with the same development database URL so migration and runtime setup stay consistent.

## Alternatives considered

- Keeping ad hoc database access: rejected because it would make the service harder to maintain and less consistent.
- Introducing a repository abstraction layer: rejected because the current scope does not require extra indirection.
- Deferring schema definition until later: rejected because the service needs a concrete data model now.

## Consequences

- Prisma migrations can be generated and applied deterministically in local development.
- The auth service keeps database access centralized through `PrismaService`.
- The schema stays lean while still supporting RBAC, sessions, and auditability.
