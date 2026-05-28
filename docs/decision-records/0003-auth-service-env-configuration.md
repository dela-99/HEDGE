# 0003 — Auth service environment configuration

## Context

The auth service needs runtime configuration for ports, database access, Redis, and JWT secrets without hardcoding sensitive values.

## Decision

Use NestJS `ConfigModule.forRoot()` as a global module with `.env` support, typed configuration objects, and startup validation for all required auth-service environment variables.

Required variables:

- `PORT`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_EXPIRES`
- `REFRESH_TOKEN_EXPIRES`
- `REDIS_URL`

Secrets stay in environment variables only, and the repository provides an `.env.example` with non-sensitive placeholders.

## Alternatives considered

- Hardcoding configuration defaults: rejected because it would hide missing secrets and weaken security.
- Reading environment variables ad hoc in each service: rejected because it spreads validation and type handling across the codebase.
- Introducing a separate secrets manager integration immediately: rejected because it is not required for the current scope.

## Consequences

- The auth service fails fast when required configuration is missing or malformed.
- Configuration access stays typed and centralized.
- Secret values are never committed to source control.
