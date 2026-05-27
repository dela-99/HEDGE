# Auth System

The auth service is the security boundary for identity, sessions, and authorization.

## Current structure

- `src/auth` — login, registration, refresh, logout, and token issuance
- `src/users` — user persistence and profile access
- `src/sessions` — refresh-token rotation and session lifecycle
- `src/audit` — security audit logging
- `src/common` — guards, decorators, filters, interceptors, middleware, pipes, and utilities
- `src/config` — environment and app configuration
- `src/database` and `src/prisma` — Prisma and Redis wiring

## Security baseline

- JWT access tokens and rotating refresh tokens
- Argon2 password hashing
- ValidationPipe with strict DTO validation
- Helmet, CORS, and rate limiting
- Global exception filtering for safe responses
- Prisma-backed audit events for fintech-grade traceability

MFA, fraud signals, and broader microservice fan-out stay out of scope until they are required.
