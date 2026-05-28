# 0002 — Auth service initial structure

## Context

The auth service needs a production-ready NestJS scaffold for JWT auth, RBAC, audit logging, and session management without introducing microservices or event-driven complexity.

## Decision

Keep the service modular inside `apps/auth-service/src` with focused domains for auth, users, sessions, audit, config, database, and Prisma integration. Use NestJS guards, decorators, and services to support security controls while keeping the codebase lean.

## Alternatives considered

- Splitting the service into microservices: rejected to avoid unnecessary operational overhead.
- Adding event buses or workflow abstractions: rejected because the current scope does not require them.
- Collapsing the structure into a single module: rejected because it would hurt maintainability.

## Consequences

- Auth, user, session, and audit concerns remain isolated but simple.
- Future shared functionality can move into `packages` if it becomes reusable.
- The service stays easy to extend without overengineering the initial scaffold.
