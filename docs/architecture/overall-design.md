# Overall Design

HEDGE is a service-oriented fintech monorepo.

- `apps/auth-service` owns authentication, authorization, session tracking, and audit logging.
- `apps/user-service`, `apps/payment-service`, and `apps/mobile-app` stay isolated until their own delivery work starts.
- `packages` holds shared types, config, security, logging, and utility code.
- `infrastructure` is reserved for deployment assets only.

Architectural decisions and major tradeoffs belong in `docs/decision-records`.
